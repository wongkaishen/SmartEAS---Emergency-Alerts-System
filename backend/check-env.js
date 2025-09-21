#!/usr/bin/env node

/**
 * Environment Check Script
 * Validates that all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking SmartEAS Environment Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 Copy .env.example to .env and configure your API keys');
  console.log('   cp .env.example .env');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

const requiredVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'BEDROCK_MODEL_ID',
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'GOOGLE_MAPS_API_KEY'
];

const optionalVars = [
  'TWITTER_BEARER_TOKEN',
  'OPENWEATHER_API_KEY'
];

let missingRequired = [];
let missingOptional = [];

console.log('Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_')) {
    console.log(`❌ ${varName}: Missing or placeholder`);
    missingRequired.push(varName);
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

console.log('\nOptional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_')) {
    console.log(`⚠️  ${varName}: Missing (optional)`);
    missingOptional.push(varName);
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

console.log('\n📊 Status Summary:');
if (missingRequired.length === 0) {
  console.log('✅ All required variables are configured!');
} else {
  console.log(`❌ ${missingRequired.length} required variables need configuration:`);
  missingRequired.forEach(varName => console.log(`   - ${varName}`));
}

if (missingOptional.length > 0) {
  console.log(`⚠️  ${missingOptional.length} optional variables not configured:`);
  missingOptional.forEach(varName => console.log(`   - ${varName}`));
}

console.log('\n🔧 API Setup Instructions:');
console.log('AWS Bedrock: Enable model access in AWS Console → Bedrock → Model access');
console.log('Reddit API: Create app at https://www.reddit.com/prefs/apps');
console.log('Google Maps: Enable APIs at https://console.cloud.google.com/apis');
console.log('Twitter API: Apply at https://developer.twitter.com (optional)');

console.log('\n🚀 Next Steps:');
if (missingRequired.length === 0) {
  console.log('Ready to start! Run: npm run dev');
} else {
  console.log('Configure missing variables in .env, then run: npm run check-env');
}
