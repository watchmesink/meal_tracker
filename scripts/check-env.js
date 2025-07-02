#!/usr/bin/env node

/**
 * Environment Variables Checker for Meal Tracker
 * Run this before deploying to ensure all required variables are set
 */

console.log('🔍 Checking Meal Tracker Environment Variables...\n');

const requiredVars = [
  { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID', critical: true },
  { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret', critical: true },
  { name: 'SESSION_SECRET', description: 'Session secret (32+ characters)', critical: true },
  { name: 'GEMINI_API_KEY', description: 'Google Gemini AI API Key', critical: false },
  { name: 'BASE_URL', description: 'Base URL for OAuth callbacks', critical: false },
];

let allGood = true;
let criticalMissing = false;

requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  const isSet = value && value.trim() !== '';
  
  if (isSet) {
    console.log(`✅ ${variable.name}: Set (${variable.description})`);
    
    // Additional validation
    if (variable.name === 'SESSION_SECRET' && value.length < 32) {
      console.log(`   ⚠️  Warning: SESSION_SECRET should be at least 32 characters long (current: ${value.length})`);
    }
    if (variable.name === 'GOOGLE_CLIENT_ID' && !value.includes('.apps.googleusercontent.com')) {
      console.log(`   ⚠️  Warning: GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com`);
    }
    if (variable.name === 'GOOGLE_CLIENT_SECRET' && !value.startsWith('GOCSPX-')) {
      console.log(`   ⚠️  Warning: GOOGLE_CLIENT_SECRET should start with GOCSPX-`);
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
  console.log('1. Create .env file with required variables (see .env.example)');
  console.log('2. Or set them in Railway Dashboard > Variables tab');
  console.log('3. Follow GOOGLE_OAUTH_SETUP.md for Google credentials');
  console.log('\n📄 See RAILWAY_DEPLOYMENT.md for detailed deployment guide');
  process.exit(1);
} else if (allGood) {
  console.log('✅ All environment variables are properly configured!');
  console.log('🚀 Ready for deployment to Railway');
} else {
  console.log('⚠️  Some optional variables are missing, but deployment should work');
  console.log('💡 Consider setting all variables for full functionality');
}

console.log('='.repeat(60)); 