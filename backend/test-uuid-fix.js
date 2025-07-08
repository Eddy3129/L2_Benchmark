require('dotenv/config');
const { randomUUID } = require('crypto');

console.log('Testing UUID generation fix...');
console.log('');

// Test the new UUID generation approach
const sessionId = randomUUID();
console.log('Generated session ID:', sessionId);

// Test UUID validation regex (same as in validation-utils.ts)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = uuidRegex.test(sessionId);

console.log('Is valid UUID format:', isValidUUID);
console.log('');

if (isValidUUID) {
  console.log('✅ UUID fix successful! Session ID now generates proper UUIDs.');
} else {
  console.log('❌ UUID fix failed! Session ID still not in proper UUID format.');
}

// Generate a few more to show consistency
console.log('');
console.log('Additional UUID samples:');
for (let i = 0; i < 3; i++) {
  const sampleId = randomUUID();
  console.log(`  ${i + 1}. ${sampleId} (valid: ${uuidRegex.test(sampleId)})`);
}