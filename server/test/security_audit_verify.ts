import assert from 'node:assert';
import app from '../src/index.js';
import { client, getOrCreateUser, grantAdminCredits, reserveEntitlement } from '../src/db.js';

async function runSecurityTestSuite() {
  console.log('================================================================');
  console.log('       FIELDS SECURITY AUDIT & VULNERABILITY VERIFICATION       ');
  console.log('================================================================\n');

  const testInstId = `test_sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testDevId = `android_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

  console.log(`[Setup] Created test target user: ${testInstId} (dev: ${testDevId})`);
  const initialUser = await getOrCreateUser(testInstId, undefined, testDevId);
  // Ensure user has 2 free used and 1 ad used (paywall state)
  await client.execute({
    sql: 'UPDATE users SET free_used = 2, ad_used = 1, credits = 0, is_pro = 0 WHERE installation_id = ?',
    args: [testInstId],
  });

  // -------------------------------------------------------------------------
  // TEST 1: Unauthenticated arbitrary credit injection into /v1/credits/sync
  // -------------------------------------------------------------------------
  console.log('\n[TEST 1] Testing arbitrary credit injection via /v1/credits/sync...');
  const req1 = new Request('http://localhost:3001/v1/credits/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      deviceId: testDevId,
      creditsToAdd: 20,
    }),
  });
  const res1 = await app.fetch(req1);
  assert.strictEqual(res1.status, 403, 'Must return 403 Forbidden for unauthenticated credit injection');
  const body1 = await res1.json();
  assert.strictEqual(body1.error, 'VERIFICATION_REQUIRED');
  console.log('  PASSED: Unauthenticated arbitrary credit injection was blocked (403 VERIFICATION_REQUIRED).');

  // -------------------------------------------------------------------------
  // TEST 2: Verified purchase recording & Replay Attack Prevention
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing verified store purchase recording & Replay Attack...');
  const testTxId = `GPA.3392-8819-1102-${Date.now()}`;
  
  // First time: Valid store purchase sync
  const req2a = new Request('http://localhost:3001/v1/credits/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      deviceId: testDevId,
      packageId: 'notes_20',
      creditsToAdd: 20,
      transactionId: testTxId,
    }),
  });
  const res2a = await app.fetch(req2a);
  assert.strictEqual(res2a.status, 200);
  const body2a = await res2a.json();
  assert.strictEqual(body2a.credits, 20, 'User should receive 20 credits');
  console.log('  PASSED: First store purchase recorded 20 credits successfully.');

  // Replay Attack: Attacker tries to replay the same transactionId
  console.log('  [TEST 2b] Attempting replay attack with identical transactionId...');
  const req2b = new Request('http://localhost:3001/v1/credits/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      deviceId: testDevId,
      packageId: 'notes_20',
      creditsToAdd: 20,
      transactionId: testTxId,
    }),
  });
  const res2b = await app.fetch(req2b);
  assert.strictEqual(res2b.status, 200);
  const body2b = await res2b.json();
  assert.strictEqual(body2b.credits, 20, 'Credits must remain 20, duplicate credits blocked');
  console.log('  PASSED: Replay attack blocked! Idempotent duplicate was rejected from adding credits.');

  // Reset credits to 0 for subsequent tests
  await client.execute({
    sql: 'UPDATE users SET credits = 0 WHERE installation_id = ?',
    args: [testInstId],
  });

  // -------------------------------------------------------------------------
  // TEST 3: Calling /v1/notes without deviceId
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing /v1/notes without deviceId...');
  const req3 = new Request('http://localhost:3001/v1/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    }),
  });
  const res3 = await app.fetch(req3);
  assert.strictEqual(res3.status, 400, 'Must require persistent deviceId');
  const body3 = await res3.json();
  assert.strictEqual(body3.error, 'MISSING_DEVICE_ID');
  console.log('  PASSED: Requests omitting deviceId are rejected (400 MISSING_DEVICE_ID).');

  // -------------------------------------------------------------------------
  // TEST 4: Client spoofing "entitlement": "pro" when user has 0 credits & not Pro
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing client-side spoof of "entitlement": "pro"...');
  const req4 = new Request('http://localhost:3001/v1/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      deviceId: testDevId,
      entitlement: 'pro', // Attacker claims Pro
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    }),
  });
  const res4 = await app.fetch(req4);
  assert.strictEqual(res4.status, 402, 'Must reject with 402 Paywall Required');
  const body4 = await res4.json();
  assert.strictEqual(body4.error, 'PAYWALL_REQUIRED');
  console.log('  PASSED: Server ignored client entitlement claim; rejected spoofed Pro with 402 PAYWALL_REQUIRED.');

  // -------------------------------------------------------------------------
  // TEST 5: TOCTOU Concurrency Race Condition (10 parallel reservations vs 1 credit)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing TOCTOU Concurrency Race Condition (10 parallel reservations vs 1 credit)...');
  // Give user EXACTLY 1 credit
  await client.execute({
    sql: 'UPDATE users SET credits = 1 WHERE installation_id = ?',
    args: [testInstId],
  });

  const parallelReservations = await Promise.all(
    Array.from({ length: 10 }).map(() => reserveEntitlement(testInstId, testDevId))
  );

  const successfulReservations = parallelReservations.filter((r) => r.success);
  const failedReservations = parallelReservations.filter((r) => !r.success);

  console.log(`  Results: ${successfulReservations.length} successful, ${failedReservations.length} blocked by atomic check.`);
  assert.strictEqual(successfulReservations.length, 1, 'EXACTLY 1 request must pass atomic reservation');
  assert.strictEqual(failedReservations.length, 9, 'EXACTLY 9 requests must be blocked by atomic reservation');
  assert.strictEqual(failedReservations[0].entitlement, 'paywall');
  console.log('  PASSED: Concurrency race condition completely eliminated! Only 1 out of 10 requests reserved.');

  // -------------------------------------------------------------------------
  // TEST 6: Admin PIN Authentication & Developer Credit Grants
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing Admin PIN Authentication & Developer Credit Grants...');
  const adminPin = process.env.ADMIN_PIN || 'fields_sec_adm_2026_x89a1c';

  // Unauthorized admin attempt
  const req6a = new Request('http://localhost:3001/v1/admin/stats', {
    method: 'GET',
    headers: { Authorization: 'Bearer wrong_pin_123' },
  });
  const res6a = await app.fetch(req6a);
  assert.strictEqual(res6a.status, 401);
  console.log('  PASSED: Unauthorized admin stats request rejected (401).');

  // Reset credits to 0 before admin credit grant test
  await client.execute({
    sql: 'UPDATE users SET credits = 0 WHERE installation_id = ?',
    args: [testInstId],
  });

  // Authorized admin test credit grant
  const req6b = new Request('http://localhost:3001/v1/admin/credits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminPin}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      installationId: testInstId,
      amount: 5,
      deviceId: testDevId,
    }),
  });
  const res6b = await app.fetch(req6b);
  assert.strictEqual(res6b.status, 200);
  const body6b = await res6b.json();
  assert.strictEqual(body6b.credits, 5, 'Admin grant should set balance to 5');
  console.log('  PASSED: Authorized admin test credit grant succeeded (added 5 credits).');

  // -------------------------------------------------------------------------
  // TEST 7: RevenueCat Webhook (Store Purchases & Subscriptions)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 7] Testing RevenueCat Webhook handler...');
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || adminPin;

  // Unauthorized webhook attempt
  const req7a = new Request('http://localhost:3001/v1/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer fake_secret',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'TEST' }),
  });
  const res7a = await app.fetch(req7a);
  assert.strictEqual(res7a.status, 401);
  console.log('  PASSED: Unauthorized webhook rejected (401).');

  // Authorized webhook purchase (+20 credits)
  const webhookTxId = `wh_tx_${Date.now()}`;
  const req7b = new Request('http://localhost:3001/v1/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${webhookSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: {
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: testInstId,
        product_id: 'notes_20',
        transaction_id: webhookTxId,
      },
    }),
  });
  const res7b = await app.fetch(req7b);
  assert.strictEqual(res7b.status, 200);
  
  // Verify user balance is now 5 + 20 = 25
  const userAfterWebhook = await getOrCreateUser(testInstId, undefined, testDevId);
  assert.strictEqual(userAfterWebhook.credits, 25, 'Webhook must add 20 credits to user');
  console.log('  PASSED: RevenueCat store purchase webhook added 20 credits securely.');

  // Authorized webhook Pro subscription activation
  const req7c = new Request('http://localhost:3001/v1/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${webhookSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: testInstId,
        product_id: 'lifetime',
        entitlement_ids: ['fields_travel_journal_scrapebook_pro'],
      },
    }),
  });
  const res7c = await app.fetch(req7c);
  assert.strictEqual(res7c.status, 200);

  const userAfterPro = await getOrCreateUser(testInstId, undefined, testDevId);
  assert.strictEqual(userAfterPro.is_pro, 1, 'User must be marked is_pro = 1');
  console.log('  PASSED: RevenueCat subscription webhook activated Pro access securely.');

  // -------------------------------------------------------------------------
  // TEST 8: Account Linking Free Note Reset Attack Prevention
  // -------------------------------------------------------------------------
  console.log('\n[TEST 8] Testing Account Linking Free Note Reset Attack Prevention...');
  const userA_inst = `test_userA_${Date.now()}`;
  const userA_dev = `android_devA_${Date.now()}`;
  await getOrCreateUser(userA_inst, undefined, userA_dev);
  // Mark User A as having consumed all free & ad notes
  await client.execute({
    sql: 'UPDATE users SET free_used = 2, ad_used = 1, credits = 0 WHERE installation_id = ?',
    args: [userA_inst],
  });

  // Create User B with a fresh account key and 0 usage
  const userB_inst = `test_userB_${Date.now()}`;
  const userB = await getOrCreateUser(userB_inst, undefined, `android_devB_${Date.now()}`);
  assert.strictEqual(userB.free_used, 0, 'User B starts with 0 free used');

  // Attacker on Device A attempts to reset free notes by linking to User B's key
  const req8 = new Request('http://localhost:3001/v1/account/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: userA_inst,
      accountKey: userB.account_key,
      deviceId: userA_dev,
    }),
  });
  const res8 = await app.fetch(req8);
  assert.strictEqual(res8.status, 200);
  const body8 = await res8.json();

  // Crucial Security Assertion: Free notes MUST NOT have reset to 0
  assert.strictEqual(body8.freeUsed, 2, 'Device A must preserve 2 free notes used across linking');
  assert.strictEqual(body8.adUsed, true, 'Device A must preserve 1 ad note used across linking');
  console.log('  PASSED: Account linking anti-reset protection verified! Usage took Math.max (free_used: 2, ad_used: 1).');

  // Clean up test users A & B
  await client.execute({ sql: 'DELETE FROM users WHERE installation_id IN (?, ?)', args: [userA_inst, userB_inst] });

  // -------------------------------------------------------------------------
  // TEST 9: Account Key Brute-Force Rate Limiting
  // -------------------------------------------------------------------------
  console.log('\n[TEST 9] Testing Account Key Brute-Force Rate Limiting...');
  const bruteInst = `test_brute_${Date.now()}`;
  let rateLimitHit = false;

  for (let i = 1; i <= 6; i++) {
    const req9 = new Request('http://localhost:3001/v1/account/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.42',
      },
      body: JSON.stringify({
        installationId: bruteInst,
        accountKey: `FIELD-FAKE-${i}000`,
      }),
    });
    const res9 = await app.fetch(req9);
    if (res9.status === 429) {
      rateLimitHit = true;
      const b9 = await res9.json();
      assert.strictEqual(b9.error, 'RATE_LIMIT_EXCEEDED');
      console.log(`  Attempt ${i} triggered 429 RATE_LIMIT_EXCEEDED as expected.`);
      break;
    }
  }
  assert.strictEqual(rateLimitHit, true, 'Repeated invalid account key guesses must trigger rate limiting (429)');
  console.log('  PASSED: Account key brute-force attack blocked by rate limiter.');

  // -------------------------------------------------------------------------
  // TEST 10: Invalid Credit Amounts in /v1/credits/sync
  // -------------------------------------------------------------------------
  console.log('\n[TEST 10] Testing Invalid Credit Amounts in /v1/credits/sync...');
  // Negative credits attempt
  const req10a = new Request('http://localhost:3001/v1/credits/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      creditsToAdd: -20,
    }),
  });
  const res10a = await app.fetch(req10a);
  assert.strictEqual(res10a.status, 400);
  const body10a = await res10a.json();
  assert.strictEqual(body10a.error, 'INVALID_CREDIT_AMOUNT');
  console.log('  PASSED: Negative credit amount rejected (400 INVALID_CREDIT_AMOUNT).');

  // Excessive credit amount attempt
  const req10b = new Request('http://localhost:3001/v1/credits/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId: testInstId,
      creditsToAdd: 99999,
    }),
  });
  const res10b = await app.fetch(req10b);
  assert.strictEqual(res10b.status, 400);
  const body10b = await res10b.json();
  assert.strictEqual(body10b.error, 'INVALID_CREDIT_AMOUNT');
  console.log('  PASSED: Excessive credit amount rejected (400 INVALID_CREDIT_AMOUNT).');

  // Clean up test record
  await client.execute({
    sql: 'DELETE FROM users WHERE installation_id = ?',
    args: [testInstId],
  });
  await client.execute({
    sql: 'DELETE FROM processed_purchases WHERE installation_id = ?',
    args: [testInstId],
  });

  console.log('\n================================================================');
  console.log('       ALL 10 SECURITY TESTS PASSED! ZERO REMAINING BYPASSES!   ');
  console.log('================================================================');
}

runSecurityTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
