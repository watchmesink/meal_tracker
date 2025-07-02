# 🚂 Deploy Meal Tracker to Railway

This guide will help you deploy your meal tracker app to Railway, a modern cloud platform.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be on GitHub
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **Google Gemini API Key** - Get one at [makersuite.google.com](https://makersuite.google.com/app/apikey)

## 🚀 Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Go to Railway**:
   - Visit [railway.app](https://railway.app)
   - Sign up/login with your GitHub account

3. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `meal_tracker` repository
   - Railway will automatically detect it's a Node.js app

4. **Configure Environment Variables** (CRITICAL STEP):
   
   ⚠️ **BEFORE DEPLOYING**: Check your environment variables locally:
   ```bash
   npm run check-env
   ```
   
   - Go to your Railway project dashboard
   - Click on the **"Variables"** tab
   - Add these **REQUIRED** variables **ONE BY ONE**:
   
   **Step 4: Add Required Environment Variable**
   ```
   Variable Name: GEMINI_API_KEY
   Value: your_actual_gemini_api_key_starting_with_AIza
   ```
   
   **Optional Variables:**
   ```
   Variable Name: NODE_ENV
   Value: production
   ```
   
   ⚠️ **IMPORTANT**: Click "Add" after setting the GEMINI_API_KEY variable.

5. **Deploy**:
   - Railway will automatically build and deploy your app
   - You'll get a URL like `https://your-app-name.railway.app`

### Method 2: Deploy with Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway project**:
   ```bash
   railway init
   ```

4. **Set environment variables**:
   ```bash
   railway variables:set GEMINI_API_KEY=your_actual_gemini_api_key
   railway variables:set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

## 🔧 Configuration Files Included

- **`railway.json`** - Railway configuration
- **`Procfile`** - Process definition for Railway
- **`.env.example`** - Environment variables template

## 📊 What Railway Provides

✅ **Automatic HTTPS** - Your app gets SSL certificates  
✅ **Custom Domain** - You can add your own domain  
✅ **Auto-scaling** - Handles traffic spikes  
✅ **Database** - SQLite files persist between deploys  
✅ **File Storage** - Your uploads/ directory persists  
✅ **Monitoring** - Built-in logs and metrics  

## 🗂️ Database & File Persistence

Railway automatically handles:
- **SQLite Database** - `meal_tracker.db` persists between deployments
- **Upload Files** - Images and audio in `uploads/` directory persist
- **Vector Database** - Any vector database files persist

## 🌍 Environment Variables Needed

⚠️ **IMPORTANT**: The app requires the GEMINI_API_KEY to function properly.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | 🚨 **REQUIRED** | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | 🚨 **REQUIRED** | `GOCSPX-abcdef123` |
| `SESSION_SECRET` | Secure random string (32+ chars) | 🚨 **REQUIRED** | `your-random-secret-at-least-32-chars` |
| `GEMINI_API_KEY` | Google Gemini AI API key | ✅ Yes | `AIza...` |
| `BASE_URL` | Your Railway app URL | ✅ Yes | `https://your-app.railway.app` |
| `NODE_ENV` | Set to "production" | ✅ Yes | `production` |
| `PORT` | App port (auto-set by Railway) | ⚠️ Auto | `3000` |

**⚠️ ERROR MESSAGE**: If you see `TypeError: OAuth2Strategy requires a clientID option`, it means `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are missing!

## 📋 Railway Deployment Logs - What to Expect

### ✅ Successful Deployment (Environment Variables Set):
```
🔍 Checking Google OAuth environment variables...
GOOGLE_CLIENT_ID: ✅ Set
GOOGLE_CLIENT_SECRET: ✅ Set  
SESSION_SECRET: ✅ Set
BASE_URL: https://your-app.railway.app
✅ Custom AI system prompt loaded from system_prompt.md
✅ Nutritionist analysis prompt loaded from nutritionist_prompt.md
🗄️ Database initialized successfully
🚀 Server is running on port 3000
```

### ❌ Failed Deployment (Environment Variables Missing):
```
🔍 Checking Google OAuth environment variables...
GOOGLE_CLIENT_ID: ❌ Missing
GOOGLE_CLIENT_SECRET: ❌ Missing
❌ CRITICAL ERROR: Google OAuth environment variables are missing!
Required variables:
- GOOGLE_CLIENT_ID (currently: undefined )
- GOOGLE_CLIENT_SECRET (currently: undefined )

🔧 To fix this:
1. Go to Railway Dashboard > Your Project > Variables
2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
3. Get these from Google Cloud Console (see GOOGLE_OAUTH_SETUP.md)
4. Redeploy the application
```

## 🔍 Post-Deployment Testing

After deployment, test these features:
1. **Google Authentication** - Sign in with Google account
2. **User isolation** - Data is specific to your user
3. **Add meals** via text description
4. **Upload photos** of food
5. **AI analysis** working correctly
6. **Data persistence** between visits
7. **Logout/Login** functionality
8. **Export functionality**

## 🐛 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `npm start` script works locally
- Check Railway build logs

### App Won't Start

**OAuth2Strategy Error** (most common issue):
```
TypeError: OAuth2Strategy requires a clientID option
```
- **Solution**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway Variables tab
- **Check**: Variables tab in Railway dashboard shows these are set and not empty
- **Note**: Railway variables are case-sensitive!

**Other startup issues**:
- Verify `GEMINI_API_KEY` is set correctly
- Check that port is configured: `process.env.PORT || 3000`
- Review Railway deployment logs

### Database Issues
- SQLite automatically creates database on first run
- Check file permissions in Railway logs
- Ensure `uploads/` directories are created properly

### AI Analysis Not Working
- Verify Gemini API key is valid and has credit
- Check API quota limits
- Review application logs for API errors

### Authentication Issues
- Check Google OAuth credentials are correct
- Verify redirect URIs in Google Console match your Railway URL
- Ensure `BASE_URL` environment variable is set correctly
- Follow the [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md)

## 💰 Railway Pricing

- **Hobby Plan**: $5/month - Perfect for personal projects
- **Pro Plan**: $20/month - For production apps
- **Free Trial**: Available for testing

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Google Gemini API](https://makersuite.google.com)
- [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md)
- [Google Cloud Console](https://console.cloud.google.com)
- [Your GitHub Repository](https://github.com/watchmesink/meal_tracker)

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Review this guide
3. Check Railway Discord community
4. Refer to Railway documentation 