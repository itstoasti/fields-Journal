#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@libsql/client/web');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const target = process.argv[2];
  const amount = parseInt(process.argv[3] || '20', 10);

  if (!target) {
    console.log('\n========================================================');
    console.log('       FIELDS DEVELOPER CREDIT GRANT TOOL              ');
    console.log('========================================================');
    console.log('\nUsage: npm run grant:credits <ACCOUNT_KEY | DEVICE_ID | INSTALLATION_ID> [AMOUNT]\n');
    console.log('Examples:');
    console.log('  npm run grant:credits FIELD-VLXH-AR94 20');
    console.log('  npm run grant:credits android_fc341bad05cf8c5a 50');
    console.log('  npm run grant:credits inst_d509xubh61evb8e6r35imkyl 20\n');
    process.exit(1);
  }

  const clean = target.trim();
  const now = new Date().toISOString();

  // Try finding user by account_key, device_id, or installation_id
  const res = await client.execute({
    sql: 'SELECT * FROM users WHERE UPPER(account_key) = UPPER(?) OR device_id = ? OR installation_id = ? LIMIT 1',
    args: [clean, clean, clean],
  });

  if (res.rows.length === 0) {
    console.error(`\n❌ User not found for identifier: "${clean}"`);
    console.error('Make sure you opened the app at least once or check Settings -> Account Key in the app.\n');
    process.exit(1);
  }

  const row = res.rows[0];
  const instId = row.installation_id;

  await client.execute({
    sql: 'UPDATE users SET credits = credits + ?, updated_at = ? WHERE installation_id = ?',
    args: [amount, now, instId],
  });

  const updated = await client.execute({
    sql: 'SELECT installation_id, account_key, device_id, credits, free_used, ad_used, is_developer, is_pro FROM users WHERE installation_id = ?',
    args: [instId],
  });

  const user = updated.rows[0];
  console.log('\n========================================================');
  console.log('       CREDITS GRANTED SUCCESSFULLY!                    ');
  console.log('========================================================');
  console.log(`  Account Key:      ${user.account_key}`);
  console.log(`  Device ID:        ${user.device_id || 'n/a'}`);
  console.log(`  Credits Added:    +${amount}`);
  console.log(`  New Balance:      ${user.credits} credits`);
  console.log(`  Free Notes Used:  ${user.free_used}/2`);
  console.log(`  Ad Note Used:     ${user.ad_used ? 'Yes' : 'No'}`);
  console.log(`  Is Pro:           ${user.is_pro ? 'Yes' : 'No'}`);
  console.log('========================================================');
  console.log('\n👉 Next step in your mobile app:');
  console.log('   Go to Settings in the app and tap "Sync Balance with Server".');
  console.log('   Your test device will instantly reflect the updated balance!\n');
}

main().catch(err => {
  console.error('\n❌ Error granting credits:', err.message);
  process.exit(1);
});
