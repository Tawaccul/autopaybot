// test-redis.js
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function testRedis() {
  console.log('🚀 [Redis] Starting test');
  try {
    const testKey = 'test:key';
    const testValue = new Date().toISOString();
    console.log('📌 [Redis] Setting key:', testKey);
    await kv.set(testKey, testValue);
    console.log('🗄️ [Redis] Key set successfully');
    const result = await kv.get(testKey);
    console.log('📌 [Redis] Retrieved value:', result);
  } catch (err) {
    console.error('❌ [Redis] Error:', err.message, err.stack);
  }
}

testRedis();