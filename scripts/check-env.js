#!/usr/bin/env node

/**
 * Environment Variables Checker for Meal Tracker
 * Run this before deploying to ensure all required variables are set
 */

console.log('🔍 Checking Meal Tracker Environment Variables...\n');

const requiredVars = [
  { name: 'GEMINI_API_KEY', description: 'Google Gemini AI API Key', critical: true },
];

let allGood = true;
let criticalMissing = false;

requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  const isSet = value && value.trim() !== '';
  
  if (isSet) {
    console.log(`✅ ${variable.name}: Set (${variable.description})`);
    
    // Additional validation
    if (variable.name === 'GEMINI_API_KEY' && !value.startsWith('AIza')) {
      console.log(`   ⚠️  Warning: GEMINI_API_KEY should start with AIza`);
    }
  } else {
    const status = variable.critical ? '❌ MISSING (CRITICAL)' : '⚠️  Missing (Optional)';
    console.log(`${status} ${variable.name}: ${variable.description}`);
    
    if (variable.critical) {
      criticalMissing = true;
      allGood = false;
    }
  }
});

console.log('\n' + '='.repeat(60));

if (criticalMissing) {
  console.log('❌ DEPLOYMENT WILL FAIL: Critical environment variables are missing!');
  console.log('\n🔧 To fix this:');
  console.log('1. Get your Gemini API key from https://makersuite.google.com/app/apikey');
  console.log('2. Set GEMINI_API_KEY in Railway Dashboard > Variables tab');
  console.log('\n📄 See RAILWAY_DEPLOYMENT.md for deployment guide');
  process.exit(1);
} else if (allGood) {
  console.log('✅ All environment variables are properly configured!');
  console.log('🚀 Ready for deployment to Railway');
} else {
  console.log('⚠️  Some optional variables are missing, but deployment should work');
  console.log('💡 Consider setting all variables for full functionality');
}

console.log('='.repeat(60)); 