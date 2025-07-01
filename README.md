# Meal Tracker Web App

A comprehensive web-based meal tracking application that uses AI to analyze food photos and text descriptions to track calories, protein, fat, carbs, and fiber intake.

## Features

- **📱 Responsive Design**: Works seamlessly on both mobile and desktop devices
- **🔍 Hybrid Food Analysis**: Uses vector search of USDA FoodData Central database with AI fallback
- **🎯 Accurate Nutrition**: Precise nutritional data from official USDA database when matches are found
- **🤖 AI-Powered Fallback**: Uses Google Gemini 2.5 Flash when exact matches aren't available
- **📊 Nutritional Tracking**: Tracks calories, protein, fat, carbs, and fiber
- **📸 Photo Upload**: Take pictures of your meals for automatic analysis
- **✏️ Text Input**: Describe your meals in text for analysis
- **📈 Daily Totals**: View your daily nutritional intake in an easy-to-read table
- **📅 History**: Browse through your daily meal history
- **💾 CSV Export**: Download your meal history as a CSV file
- **🗑️ Meal Management**: Delete meals if needed
- **🌅 New Day**: Reset for a new day of tracking

## Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory with the following content:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

   **To get a Gemini API key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy the key and paste it in your `.env` file

4. **Start the application**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Set up vector database (optional but recommended)**:
   ```bash
   # Create sample embeddings for testing (recommended)
   node scripts/create-sample-embeddings.js
   
   # OR create full embeddings for all 60,000+ foods (takes time due to API rate limits)
   node scripts/setup-vector-db.js
   ```

6. **Access the application**:
   Open your browser and go to `http://localhost:3000`

## Usage Guide

### Adding Meals

#### Text Description
1. Navigate to the "Add Meal" section
2. In the "Text Description" area, describe your meal (e.g., "2 slices of whole wheat toast with butter and jam")
3. Click "Add Meal"
4. The AI will analyze your description and extract nutritional information

#### Photo Upload
1. Navigate to the "Add Meal" section
2. In the "Photo Upload" area, click "Choose Photo or Take Picture"
3. Select a photo from your device or take a new one
4. Optionally add additional description
5. Click "Add Meal with Photo"
6. The AI will analyze both the image and description

### Viewing Daily Totals

The "Today's Totals" section displays:
- Current date
- Total calories consumed
- Total protein, fat, carbs, and fiber in grams

### Managing Meals

- View all meals added today in the "Today's Meals" section
- Each meal shows:
  - Photo (if uploaded)
  - Description
  - Time added
  - Nutritional breakdown
- Delete meals using the red "Delete" button

### History

1. Click the "History" tab at the bottom (mobile) or in the navigation
2. Browse through your daily totals for the past 30 days
3. Click on any day to see detailed information

### Exporting Data

Click the "Export CSV" button in the header to download your meal history as a spreadsheet-compatible CSV file.

### New Day

Click the "New Day" button to refresh the current day's data (though the app automatically tracks by date).

## Technical Details

### Architecture

- **Backend**: Node.js with Express
- **Database**: SQLite (local file storage)
- **Vector Database**: Custom SQLite-based vector storage for food embeddings
- **USDA Data**: FoodData Central dataset with 60,000+ foods and precise nutritional information
- **AI Integration**: Google Gemini API for embeddings generation and fallback analysis
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **File Upload**: Multer for handling image uploads

### Hybrid Analysis System

The app uses a sophisticated hybrid approach for food analysis:

1. **Vector Search**: Creates embeddings for food descriptions and searches against USDA FoodData Central
2. **Semantic Matching**: Finds similar foods using cosine similarity (e.g., "grilled chicken breast" matches "Chicken, broiler, breast, skinless, boneless, meat only, cooked, grilled")
3. **Quantity Adjustment**: Automatically adjusts nutritional values based on quantity indicators in descriptions
4. **AI Fallback**: Uses Google Gemini when vector search doesn't find good matches (75%+ similarity threshold)
5. **Precision**: USDA data provides accurate nutritional values per 100g, avoiding AI estimation errors

### Database Schema

#### meals table
- `id`: Primary key
- `date`: Date of meal (YYYY-MM-DD)
- `description`: Meal description
- `calories`: Calculated calories
- `protein`, `fat`, `carbs`, `fiber`: Nutritional values in grams
- `image_path`: Path to uploaded image (if any)
- `created_at`: Timestamp

#### daily_totals table
- `id`: Primary key
- `date`: Date (YYYY-MM-DD)
- `total_calories`: Sum of daily calories
- `total_protein`, `total_fat`, `total_carbs`, `total_fiber`: Daily sums
- `updated_at`: Last update timestamp

### API Endpoints

- `POST /api/meals/text` - Add meal via text description
- `POST /api/meals/photo` - Add meal via photo upload
- `GET /api/meals/today` - Get today's meals and totals
- `GET /api/meals/:date` - Get meals for specific date
- `GET /api/history` - Get daily history (last 30 days)
- `DELETE /api/meals/:id` - Delete a meal
- `GET /api/export/csv` - Export data as CSV

## Responsive Design

The application is fully responsive and optimized for:
- **Mobile phones** (320px and up)
- **Tablets** (768px and up)
- **Desktop computers** (1024px and up)

Key responsive features:
- Touch-friendly interface on mobile
- Camera integration for photo capture
- Optimized navigation (bottom tabs on mobile, top navigation on desktop)
- Scalable typography and spacing
- Horizontal scrolling tables on small screens

## Privacy & Data

- All data is stored locally in an SQLite database
- Photos are stored locally on your server
- The only external API call is to Google Gemini for food analysis
- No personal data is sent to external services except meal descriptions/photos for AI analysis

## Troubleshooting

### Common Issues

1. **"Failed to add meal" error**:
   - Check your internet connection
   - Verify your Gemini API key is correct
   - Ensure you have API quota remaining

2. **Photos not uploading**:
   - Check file size (must be under 10MB)
   - Ensure file is a valid image format
   - Check browser permissions for camera access

3. **App not loading**:
   - Verify Node.js is installed
   - Check that port 3000 is not in use
   - Ensure all dependencies are installed

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Check the server logs in the terminal
3. Verify your `.env` file configuration
4. Ensure your Gemini API key has the necessary permissions

## License

This project is open source and available under the MIT License. 