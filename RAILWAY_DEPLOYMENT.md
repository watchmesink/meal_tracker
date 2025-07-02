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

4. **Configure Environment Variables**:
   - Go to your project dashboard
   - Click on the "Variables" tab
   - Add these variables:
     ```
     GEMINI_API_KEY=your_actual_gemini_api_key
     NODE_ENV=production
     ```
   - Railway automatically sets `PORT` for you

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

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | ✅ Yes |
| `NODE_ENV` | Set to "production" | ✅ Yes |
| `PORT` | App port (auto-set by Railway) | ⚠️ Auto |

## 🔍 Post-Deployment Testing

After deployment, test these features:
1. **Add meals** via text description
2. **Upload photos** of food
3. **AI analysis** working correctly
4. **Data persistence** between visits
5. **Export functionality**

## 🐛 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `npm start` script works locally
- Check Railway build logs

### App Won't Start
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

## 💰 Railway Pricing

- **Hobby Plan**: $5/month - Perfect for personal projects
- **Pro Plan**: $20/month - For production apps
- **Free Trial**: Available for testing

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Google Gemini API](https://makersuite.google.com)
- [Your GitHub Repository](https://github.com/watchmesink/meal_tracker)

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Review this guide
3. Check Railway Discord community
4. Refer to Railway documentation 