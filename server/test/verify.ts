import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Set test environment
process.env.DATABASE_PATH = path.resolve(process.cwd(), 'data', 'test_fieldnotes.db');
process.env.XAI_API_KEY = 'mock';

import {
  db,
  getOrCreateUser,
  determineEntitlement,
  consumeUserEntitlement,
  addCreditsToUser,
  logGenerationRecord,
} from '../src/db.js';
import { buildGrokPrompt, LOCKED_GROK_PROMPT_TEMPLATE } from '../src/prompt.js';
import { generateFieldNoteImage } from '../src/grok.js';

async function runTests() {
  console.log('=== RUNNING FIELD NOTES VERIFICATION TESTS ===\n');

  // Test 1: Prompt Template & Interpolation
  console.log('Test 1: Testing Locked Grok Prompt Interpolation...');
  const testData = {
    place: 'Mount Fuji Station 5',
    number: '07',
    keywords: ['Volcanic stone', 'Morning frost', 'Pine trail'] as [string, string, string],
    year: '2026',
  };

  const generatedPrompt = buildGrokPrompt(testData);

  assert.ok(generatedPrompt.includes('Mount Fuji Station 5'), 'Place must be interpolated');
  assert.ok(generatedPrompt.includes('No. 07'), 'Number must be interpolated with No. prefix');
  assert.ok(generatedPrompt.includes('Volcanic stone · Morning frost · Pine trail'), 'Keywords must be formatted');
  assert.ok(generatedPrompt.includes('2026'), 'Year must be interpolated');
  assert.ok(!generatedPrompt.includes('{{PLACE}}'), 'No unreplaced placeholders');
  assert.ok(!generatedPrompt.includes('{{NUMBER}}'), 'No unreplaced placeholders');
  assert.ok(!generatedPrompt.includes('{{KEYWORD_1}}'), 'No unreplaced placeholders');
  assert.ok(!generatedPrompt.includes('{{KEYWORD_2}}'), 'No unreplaced placeholders');
  assert.ok(!generatedPrompt.includes('{{KEYWORD_3}}'), 'No unreplaced placeholders');
  assert.ok(!generatedPrompt.includes('{{YEAR}}'), 'No unreplaced placeholders');
  assert.ok(generatedPrompt.includes('4:3 landscape Rubber Stamp Travel Field Notes Poster'), 'Contains base prompt');
  console.log('✓ Test 1 Passed: Prompt properly locked and interpolated.\n');

  // Test 2: Entitlement State Machine (Free -> Free -> Ad -> Paywall -> Credit)
  console.log('Test 2: Testing Entitlement State Machine & Monetization Logic...');
  const testUserId = `test_user_${Date.now()}`;

  // Initial user
  let user = getOrCreateUser(testUserId);
  assert.strictEqual(user.free_used, 0, 'New user starts with 0 free used');
  assert.strictEqual(user.ad_used, 0, 'New user starts with 0 ad used');
  assert.strictEqual(user.credits, 0, 'New user starts with 0 credits');
  assert.strictEqual(determineEntitlement(user), 'free', 'Note 1 must be free');

  // Note 1 generated
  assert.ok(consumeUserEntitlement(testUserId, 'free'), 'Consume Note 1 free entitlement');
  user = getOrCreateUser(testUserId);
  assert.strictEqual(user.free_used, 1);
  assert.strictEqual(determineEntitlement(user), 'free', 'Note 2 must be free');

  // Note 2 generated
  assert.ok(consumeUserEntitlement(testUserId, 'free'), 'Consume Note 2 free entitlement');
  user = getOrCreateUser(testUserId);
  assert.strictEqual(user.free_used, 2);
  assert.strictEqual(determineEntitlement(user), 'ad', 'Note 3 must require rewarded ad');

  // Attempting to consume free slot when freeUsed >= 2 must fail
  assert.strictEqual(consumeUserEntitlement(testUserId, 'free'), false, 'Cannot consume free slot when exhausted');

  // Note 3: Rewarded video watched and earned
  assert.ok(consumeUserEntitlement(testUserId, 'ad'), 'Consume Note 3 ad entitlement');
  user = getOrCreateUser(testUserId);
  assert.strictEqual(user.ad_used, 1);
  assert.strictEqual(determineEntitlement(user), 'paywall', 'Note 4 must require paywall when credits == 0');

  // Attempting to consume ad slot again must fail
  assert.strictEqual(consumeUserEntitlement(testUserId, 'ad'), false, 'Cannot consume ad slot again');

  // Buy notes_20 (20 credits)
  user = addCreditsToUser(testUserId, 20, 'rc_customer_123');
  assert.strictEqual(user.credits, 20, 'User received 20 credits');
  assert.strictEqual(determineEntitlement(user), 'credit', 'User now has credit entitlement');

  // Generate 1 note using credit
  assert.ok(consumeUserEntitlement(testUserId, 'credit'), 'Consume 1 credit');
  user = getOrCreateUser(testUserId);
  assert.strictEqual(user.credits, 19, 'Credits decremented to 19');
  assert.strictEqual(determineEntitlement(user), 'credit', 'User still has credit entitlement');

  console.log('✓ Test 2 Passed: 2 Free -> 1 Ad -> Paywall -> 20 Credits state machine verified.\n');

  // Test 3: Mock Grok generation & Fail-safe protection
  console.log('Test 3: Testing Image Edit Generation & Failure Protection...');
  const fakeImageBuffer = Buffer.from('fake-jpeg-binary-data-for-testing');
  const grokResult = await generateFieldNoteImage({
    imageBuffer: fakeImageBuffer,
    mimeType: 'image/jpeg',
    prompt: generatedPrompt,
  });

  assert.ok(grokResult.imageBase64 || grokResult.imageUrl, 'Returns image data');
  console.log('✓ Test 3 Passed: Grok generation completed with model:', grokResult.modelUsed);

  // Test 4: Generation logging
  logGenerationRecord('test_gen_01', testUserId, 'Kyoto', '01', 'success', grokResult.modelUsed);
  const genRow = db.prepare('SELECT * FROM generations WHERE id = ?').get('test_gen_01') as any;
  assert.ok(genRow, 'Generation log persisted');
  assert.strictEqual(genRow.status, 'success');
  console.log('✓ Test 4 Passed: Durable SQLite generation logging verified.\n');

  console.log('ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');

  // Cleanup test database
  try {
    if (fs.existsSync(process.env.DATABASE_PATH!)) {
      fs.unlinkSync(process.env.DATABASE_PATH!);
    }
  } catch {}
}

runTests().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
