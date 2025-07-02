# 🔐 Google OAuth Setup Guide

This guide will help you set up Google OAuth 2.0 authentication for the Meal Tracker app.

## 📋 Prerequisites

- Google account
- Google Cloud Console access
- Meal tracker app (local or deployed)

## 🚀 Step-by-Step Setup

### 1. Create Google Cloud Project

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing one:
   - Click "New Project"
   - Name: `Meal Tracker App` (or your preferred name)
   - Click "Create"

### 2. Enable Google+ API

1. **Go to [APIs & Services](https://console.cloud.google.com/apis/dashboard)**
2. **Click "Enable APIs and Services"**
3. **Search for "Google+ API"** or **"People API"**
4. **Click "Enable"**

### 3. Configure OAuth Consent Screen

1. **Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)**
2. **Choose "External"** (unless you have G Workspace)
3. **Fill out required information:**
   - App name: `Meal Tracker`
   - User support email: Your email
   - Developer contact: Your email
4. **Add scopes** (click "Add or Remove Scopes"):
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. **Add test users** (for development):
   - Add your email and any test users
6. **Save and continue**

### 4. Create OAuth Credentials

1. **Go to [Credentials](https://console.cloud.google.com/apis/credentials)**
2. **Click "Create Credentials" → "OAuth 2.0 Client IDs"**
3. **Select "Web application"**
4. **Configure:**
   - Name: `Meal Tracker Web Client`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for local development)
     - `https://your-app-name.railway.app` (for Railway deployment)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/auth/google/callback` (local)
     - `https://your-app-name.railway.app/auth/google/callback` (Railway)
5. **Click "Create"**

### 5. Copy Credentials

After creating, you'll see:
- **Client ID**: `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdef123456`

**⚠️ Keep these secure!** Don't commit them to Git.

## 🔧 Environment Variables Setup

### For Local Development

Create a `.env` file in your project root:

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Base URL for local development
BASE_URL=http://localhost:3000

# Other required variables
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
PORT=3000
```

### For Railway Deployment

In Railway dashboard, add these environment variables:

| Variable | Value | Example |
|----------|-------|---------|
| `GOOGLE_CLIENT_ID` | Your Google Client ID | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret | `GOCSPX-abcdef123456` |
| `SESSION_SECRET` | Random secure string | `your-secure-random-string-here` |
| `BASE_URL` | Your Railway app URL | `https://meal-tracker-production.railway.app` |
| `GEMINI_API_KEY` | Your Gemini API key | `AIza...` |
| `NODE_ENV` | `production` | `production` |

## 🔐 Security Best Practices

### Session Secret Generation

Generate a secure session secret:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Domain Security

- **Local Development**: Use `http://localhost:3000`
- **Production**: Always use `https://` for production URLs
- **Multiple Domains**: Add each domain separately in Google Console

## 🧪 Testing Authentication

### Local Testing

1. **Start your app**: `npm start`
2. **Go to**: `http://localhost:3000`
3. **You should see**: Login page with "Sign in with Google" button
4. **Click sign in**: Should redirect to Google OAuth
5. **After authorization**: Should redirect back to your app

### Production Testing

1. **Deploy to Railway** with environment variables set
2. **Visit your Railway URL**
3. **Test the same OAuth flow**

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in Google Console.

**Solution**:
1. Check the exact URL in the error message
2. Add it to "Authorized redirect URIs" in Google Console
3. Make sure `BASE_URL` environment variable is correct

### "access_blocked" Error

**Problem**: Your OAuth consent screen is in testing mode.

**Solutions**:
1. Add your email to "Test users" in OAuth consent screen
2. Or publish your OAuth consent screen (requires verification for production)

### "invalid_client" Error

**Problem**: Client ID or Client Secret is incorrect.

**Solution**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your environment variables
2. Make sure there are no extra spaces or quotes
3. Regenerate credentials if needed

### Session Issues

**Problem**: Users get logged out frequently or can't stay logged in.

**Solutions**:
1. Make sure `SESSION_SECRET` is set and consistent
2. For Railway: Ensure `BASE_URL` matches your actual domain
3. Check that cookies are being set properly (HTTPS for production)

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

## 🔄 Updating Redirect URIs

When you change domains or add new environments:

1. **Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**
2. **Click on your OAuth 2.0 client**
3. **Add new URIs to "Authorized redirect URIs"**:
   - Format: `https://your-new-domain.com/auth/google/callback`
4. **Click "Save"**

**Note**: Changes may take a few minutes to propagate.

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Redirect URIs added for all environments
- [ ] Environment variables set correctly
- [ ] `.env` file created (local) or variables set (Railway)
- [ ] Authentication tested locally
- [ ] Authentication tested in production
- [ ] Session secret is secure and random

## 🎉 Success!

Once setup is complete, your users will be able to:

✅ Sign in with their Google account  
✅ Have their meal data isolated and secure  
✅ Access the app from any device with their Google login  
✅ Enjoy automatic session management  

Your meal tracker app now has enterprise-grade authentication! 🔐 