const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const foodVectorService = require('./food-vector-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load the AI system prompt
let systemPrompt = '';
try {
  systemPrompt = fs.readFileSync('system_prompt.md', 'utf-8');
  console.log('✅ Custom AI system prompt loaded from system_prompt.md');
} catch (error) {
  console.error('⚠️ Could not load system_prompt.md, using default fallback prompt.', error.message);
  // This hardcoded prompt will be used if the file is missing.
  systemPrompt = `Analyze the nutritional content of the following meal. Meal Description: "{{meal_description}}"
  Provide the response in a strict JSON format with "total_nutrition" and "ingredients" keys.`;
}

// Load the nutritionist analysis prompt
let nutritionistPrompt = '';
try {
  nutritionistPrompt = fs.readFileSync('nutritionist_prompt.md', 'utf-8');
  console.log('✅ Nutritionist analysis prompt loaded from nutritionist_prompt.md');
} catch (error) {
  console.error('⚠️ Could not load nutritionist_prompt.md, using default fallback prompt.', error.message);
  nutritionistPrompt = `You are a nutritionist. Analyze the daily meals and provide constructive feedback on nutrition quality, balance, and recommendations for improvement. Keep it concise and actionable.

**Date:** {{date}}
**Total Nutrition:** {{totals}}
**Meals:** {{meals}}`;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Authentication removed - single user mode
console.log('ℹ️ Running in single-user mode (no authentication required)');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.mimetype.startsWith('audio/')) {
      uploadDir = 'uploads/audio';
    } else if (file.mimetype.startsWith('image/')) {
      uploadDir = 'uploads/images';
    } else {
      uploadDir = 'uploads';
    }
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}-${uuidv4()}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for audio files
  fileFilter: (req, file, cb) => {
    // Accept images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'), false);
    }
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('meal_tracker.db');

// Create tables
db.serialize(() => {
  // Check for database migrations
  db.get("PRAGMA table_info(meals)", (err, row) => {
    if (!err && row) {
      db.all("PRAGMA table_info(meals)", (err, columns) => {
        if (!err) {
          const hasOldColumn = columns.some(col => col.name === 'image_path');
          const hasNewColumn = columns.some(col => col.name === 'image_paths');
          const hasAudioPath = columns.some(col => col.name === 'audio_path');
          const hasTranscription = columns.some(col => col.name === 'transcription');
          const hasInputMethod = columns.some(col => col.name === 'input_method');
          const hasOriginalPrompt = columns.some(col => col.name === 'original_prompt');
          const hasNutritionSource = columns.some(col => col.name === 'nutrition_source');
          const hasNutritionDetails = columns.some(col => col.name === 'nutrition_details');
          
          // Migrate from image_path to image_paths
          if (hasOldColumn && !hasNewColumn) {
            console.log('🔄 Migrating database schema from image_path to image_paths...');
            
            db.run("ALTER TABLE meals ADD COLUMN image_paths TEXT", (err) => {
              if (!err) {
                db.run(`UPDATE meals SET image_paths = 
                  CASE 
                    WHEN image_path IS NOT NULL AND image_path != '' 
                    THEN '["' || image_path || '"]'
                    ELSE '[]'
                  END`, (err) => {
                  if (!err) {
                    console.log('✅ Successfully migrated meal images data');
                  } else {
                    console.error('❌ Error migrating data:', err);
                  }
                });
              }
            });
          }
          
          // Add audio columns if missing
          if (!hasAudioPath) {
            console.log('🔄 Adding audio_path column...');
            db.run("ALTER TABLE meals ADD COLUMN audio_path TEXT", (err) => {
              if (err) console.error('❌ Error adding audio_path column:', err);
              else console.log('✅ Added audio_path column');
            });
          }
          
          if (!hasTranscription) {
            console.log('🔄 Adding transcription column...');
            db.run("ALTER TABLE meals ADD COLUMN transcription TEXT", (err) => {
              if (err) console.error('❌ Error adding transcription column:', err);
              else console.log('✅ Added transcription column');
            });
          }
          
          if (!hasInputMethod) {
            console.log('🔄 Adding input_method column...');
            db.run("ALTER TABLE meals ADD COLUMN input_method TEXT DEFAULT 'text'", (err) => {
              if (err) console.error('❌ Error adding input_method column:', err);
              else console.log('✅ Added input_method column');
            });
          }
          
          if (!hasOriginalPrompt) {
            console.log('🔄 Adding original_prompt column...');
            db.run("ALTER TABLE meals ADD COLUMN original_prompt TEXT", (err) => {
              if (err) console.error('❌ Error adding original_prompt column:', err);
              else console.log('✅ Added original_prompt column');
            });
          }
          
          if (!hasNutritionSource) {
            console.log('🔄 Adding nutrition_source column...');
            db.run("ALTER TABLE meals ADD COLUMN nutrition_source TEXT", (err) => {
              if (err) console.error('❌ Error adding nutrition_source column:', err);
              else console.log('✅ Added nutrition_source column');
            });
          }

          if (!hasNutritionDetails) {
            console.log('🔄 Adding nutrition_details column...');
            db.run("ALTER TABLE meals ADD COLUMN nutrition_details TEXT", (err) => {
                if (err) console.error('❌ Error adding nutrition_details column:', err);
                else console.log('✅ Added nutrition_details column');
            });
          }
        }
      });
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    image_paths TEXT,
    audio_path TEXT,
    transcription TEXT,
    input_method TEXT DEFAULT 'text',
    original_prompt TEXT,
    nutrition_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audio_recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER,
    file_path TEXT NOT NULL,
    original_filename TEXT,
    file_size INTEGER,
    duration_seconds REAL,
    transcription TEXT,
    transcription_confidence REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS daily_totals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    total_calories REAL DEFAULT 0,
    total_protein REAL DEFAULT 0,
    total_fat REAL DEFAULT 0,
    total_carbs REAL DEFAULT 0,
    total_fiber REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
  )`);
});

// Helper function to get current date
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Vector DB mode toggle
let vectorDbEnabled = false;

// API to get current vector DB mode
app.get('/api/vector-db-mode', (req, res) => {
  res.json({ enabled: vectorDbEnabled });
});

// API to set vector DB mode
app.post('/api/vector-db-mode', (req, res) => {
  const { enabled } = req.body;
  vectorDbEnabled = !!enabled;
  res.json({ enabled: vectorDbEnabled });
});

// Enhanced function to analyze food with vector search + Gemini fallback
async function analyzeFoodWithHybridSearch(description, imagePath = null) {
  try {
    console.log(`Analyzing food: "${description}"`);
    if (vectorDbEnabled) {
      // Try vector DB first, fallback to AI
    const hasEmbeddings = await foodVectorService.hasEmbeddingsData();
      const MIN_COMPLETENESS_THRESHOLD = 0.8;
    if (hasEmbeddings) {
      console.log('Attempting vector search...');
      const vectorResult = await foodVectorService.analyzeFood(description, imagePath);
        const completeness = (vectorResult && Number.isFinite(vectorResult.nutrition_completeness)) ? vectorResult.nutrition_completeness : 0;
      if (completeness >= MIN_COMPLETENESS_THRESHOLD) {
        console.log(`✅ Vector search successful - matched: ${vectorResult.matched_food} (${(vectorResult.similarity * 100).toFixed(1)}% similarity, ${(completeness * 100).toFixed(0)}% completeness)`);
        vectorResult.ingredients = [{
          name: vectorResult.matched_food,
            weight_grams: null,
          calories: vectorResult.calories,
          protein: vectorResult.protein,
          fat: vectorResult.fat,
          carbs: vectorResult.carbs,
          fiber: vectorResult.fiber
        }];
        return vectorResult;
      } else if (vectorResult) {
        console.log(`⚠️ Vector search result for "${vectorResult.matched_food}" has low nutrition completeness (${(completeness * 100).toFixed(0)}%). Falling back to AI.`);
      } else {
        console.log('No vector match found. Falling back to AI.');
      }
    }
      // Fallback to Gemini AI
    console.log('Using Gemini AI for detailed analysis...');
    return await analyzeFoodWithGemini(description, imagePath);
    } else {
      // VECTOR DATABASE DISABLED - Using only Gemini AI for analysis
      console.log('Vector database disabled - using Gemini AI for detailed analysis...');
      return await analyzeFoodWithGemini(description, imagePath);
    }
  } catch (error) {
    console.error('Error in hybrid food analysis:', error);
    return await analyzeFoodWithGemini(description, imagePath);
  }
}

// Helper function to analyze food with Gemini (original function, now as fallback)
async function analyzeFoodWithGemini(description, imagePath = null) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = systemPrompt.replace('{{meal_description}}', description);

    let parts = [{ text: prompt }];
    
    if (imagePath && fs.existsSync(imagePath)) {
      const imageData = fs.readFileSync(imagePath);
      parts.push({
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: 'image/jpeg'
        }
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response.');
    }
    
    let rawData;
    try {
      rawData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`Failed to parse JSON from AI response: ${e.message}`);
    }
      
    const totals = rawData.totals || {};
    const items = rawData.items || [];
    const notes = rawData.notes || '';

    const mappedIngredients = items.map(item => ({
      name: item.ingredient || 'Unnamed Ingredient',
      weight_grams: item.quantity_g || 0,
      calories: item.calories_kcal || 0,
      protein: item.protein_g || 0,
      fat: item.fat_g || 0,
      carbs: item.carbs_g || 0,
      fiber: item.fiber_g || 0
    }));

    const finalDescription = notes ? `${description} (Notes: ${notes})` : description;

    return {
        calories: totals.calories_kcal || 0,
        protein: totals.protein_g || 0,
        fat: totals.fat_g || 0,
        carbs: totals.carbs_g || 0,
        fiber: totals.fiber_g || 0,
        description: finalDescription,
        ingredients: mappedIngredients,
        source: 'gemini_ai'
    };
  } catch (error) {
    console.error('Error in analyzeFoodWithGemini:', error);
    
    // Check if it's a quota exceeded error
    if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
      return {
        calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
        description: `${description} (Notes: Daily AI quota exceeded. Please try again tomorrow or upgrade your API plan.)`,
        ingredients: [],
        source: 'quota_exceeded'
      };
    } else {
      return {
        calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
        description: `(AI Analysis Failed) ${description}`,
        ingredients: [],
        source: 'fallback_error'
      };
    }
  }
}

// Helper function to update daily totals
function updateDailyTotals(date, callback) {
  db.get(`SELECT 
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(fat) as total_fat,
    SUM(carbs) as total_carbs,
    SUM(fiber) as total_fiber
    FROM meals WHERE date = ?`, [date], (err, row) => {
    if (err) {
      callback(err);
      return;
    }

    db.run(`INSERT OR REPLACE INTO daily_totals 
      (date, total_calories, total_protein, total_fat, total_carbs, total_fiber, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, row.total_calories || 0, row.total_protein || 0, row.total_fat || 0, 
       row.total_carbs || 0, row.total_fiber || 0],
      callback
    );
  });
}

// API Routes

// Add meal (unified - text and/or multiple photos)
app.post('/api/meals/unified', upload.array('photos', 10), async (req, res) => {
  try {
    const { description } = req.body;
    const photos = req.files || [];
    const date = getCurrentDate();
    
    console.log(`[${new Date().toISOString()}] Received new meal request. Description: "${description}", Photos: ${photos.length}`);

    if (!description && photos.length === 0) {
      console.log('[ERROR] Request rejected: Description or photos are required.');
      return res.status(400).json({ error: 'Description or photos are required' });
    }

    // Prepare description for AI analysis
    let mealDescription = description || 'Food from photos';
    const imagePaths = photos.map(photo => photo.path);
    
    // Analyze with hybrid search (vector + Gemini fallback)
    const primaryImagePath = photos.length > 0 ? photos[0].path : null;
    
    console.log('[LOG] Starting hybrid analysis...');
    const nutritionData = await analyzeFoodWithHybridSearch(mealDescription, primaryImagePath);
    console.log('[LOG] Hybrid analysis complete. Result:', JSON.stringify(nutritionData, null, 2));
    
    db.run(`INSERT INTO meals (date, description, calories, protein, fat, carbs, fiber, image_paths, input_method, original_prompt, nutrition_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, nutritionData.description, nutritionData.calories, nutritionData.protein,
       nutritionData.fat, nutritionData.carbs, nutritionData.fiber, JSON.stringify(imagePaths),
       photos.length > 0 ? 'photo' : 'text', mealDescription, nutritionData.source || 'unknown'],
      function(err) {
        if (err) {
          console.error('[ERROR] Failed to insert meal into database:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        const mealId = this.lastID;
        console.log(`[SUCCESS] Meal inserted with ID: ${mealId}`);

        updateDailyTotals(date, (err) => {
          if (err) console.error('[ERROR] Error updating daily totals:', err);
        });
        
        res.json({ 
          id: mealId,
          message: 'Meal added successfully',
          nutritionData: { // Send totals
              calories: nutritionData.calories,
              protein: nutritionData.protein,
              fat: nutritionData.fat,
              carbs: nutritionData.carbs,
              fiber: nutritionData.fiber,
              description: nutritionData.description
          },
          nutritionDetails: nutritionData.ingredients, // Send transient breakdown
          imagePaths,
          analysisMethod: vectorDbEnabled ? (nutritionData.source === 'usda_vector_search' ? 'Hybrid (Vector+AI)' : 'AI Only') : 'AI Only'
        });
      }
    );
  } catch (error) {
    console.error(`[FATAL] Unhandled error in /api/meals/unified:`, error);
    res.status(500).json({ error: 'Failed to add meal due to an unexpected server error.' });
  }
});

// Add meal (text description)
app.post('/api/meals/text', async (req, res) => {
  try {
    const { description } = req.body;
    const date = getCurrentDate();
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const nutritionData = await analyzeFoodWithHybridSearch(description);
    
    db.run(`INSERT INTO meals (date, description, calories, protein, fat, carbs, fiber, image_paths)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, nutritionData.description, nutritionData.calories, nutritionData.protein,
       nutritionData.fat, nutritionData.carbs, nutritionData.fiber, JSON.stringify([])],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        updateDailyTotals(date, (err) => {
          if (err) console.error('Error updating daily totals:', err);
        });
        
        res.json({ 
          id: this.lastID,
          message: 'Meal added successfully',
          nutritionData
        });
      }
    );
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Add meal (photo upload)
app.post('/api/meals/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const date = getCurrentDate();
    const imagePath = req.file.path;
    const description = req.body.description || 'Food from photo';
    
    const nutritionData = await analyzeFoodWithHybridSearch(description, imagePath);
    
    db.run(`INSERT INTO meals (date, description, calories, protein, fat, carbs, fiber, image_paths)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, nutritionData.description, nutritionData.calories, nutritionData.protein,
       nutritionData.fat, nutritionData.carbs, nutritionData.fiber, JSON.stringify([imagePath])],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        updateDailyTotals(date, (err) => {
          if (err) console.error('Error updating daily totals:', err);
        });
        
        res.json({ 
          id: this.lastID,
          message: 'Meal added successfully',
          nutritionData
        });
      }
    );
  } catch (error) {
    console.error('Error adding meal with photo:', error);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Get today's meals and totals
app.get('/api/meals/today', (req, res) => {
  const date = getCurrentDate();
  
  db.all(`SELECT * FROM meals WHERE date = ? ORDER BY created_at DESC`, [date], (err, meals) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const mealsWithParsedImages = meals.map(meal => ({
      ...meal,
      image_paths: meal.image_paths ? JSON.parse(meal.image_paths) : []
    }));
    
    db.get(`SELECT * FROM daily_totals WHERE date = ?`, [date], (err, totals) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        date,
        meals: mealsWithParsedImages,
        totals: totals || {
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          total_fiber: 0
        }
      });
    });
  });
});

// Get AI nutritionist analysis for today
app.get('/api/nutritionist/today', async (req, res) => {
  try {
    const date = getCurrentDate();
    
    // Get user's timezone from query parameter or default to UTC
    const userTimezone = req.query.timezone || 'UTC';
    
    // Get today's meals and totals
    const meals = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM meals WHERE date = ? ORDER BY created_at DESC`, [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const totals = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM daily_totals WHERE date = ?`, [date], (err, row) => {
        if (err) reject(err);
        else resolve(row || {
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          total_fiber: 0
        });
      });
    });
    
    // Calculate timing context using user's timezone
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: userTimezone
    });
    
    // Get current hour and minutes in user's timezone
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const currentHour = userNow.getHours();
    const currentMinutes = userNow.getMinutes();
    const dayProgress = Math.round(((currentHour * 60 + currentMinutes) / (24 * 60)) * 100);
    
    // Determine day phase
    let dayPhase;
    if (currentHour < 11) {
      dayPhase = `Early Day (${dayProgress}% of day passed) - Morning/Breakfast phase`;
    } else if (currentHour < 16) {
      dayPhase = `Mid-Day (${dayProgress}% of day passed) - Lunch/Afternoon phase`;
    } else if (currentHour < 20) {
      dayPhase = `Evening (${dayProgress}% of day passed) - Dinner phase`;
    } else {
      dayPhase = `Late Night (${dayProgress}% of day passed) - End of day review`;
    }
    
    // Skip analysis if no meals
    if (!meals || meals.length === 0) {
      let noMealsMessage;
      if (currentHour < 11) {
        noMealsMessage = "🌅 **Good morning!** No meals logged yet today.\n\nStart your day by logging your breakfast to get personalized nutritional insights and guidance for the day ahead.";
      } else if (currentHour < 16) {
        noMealsMessage = "☀️ **It's mid-day** and no meals logged yet!\n\nTime to fuel your body - log your first meal to get nutritional insights and catch up on your daily needs.";
      } else if (currentHour < 20) {
        noMealsMessage = "🌆 **Evening check-in** - no meals logged today.\n\nIf you haven't eaten yet, consider logging your meals to track your nutrition and get personalized recommendations.";
      } else {
        noMealsMessage = "🌙 **End of day** - no meals were logged today.\n\nTomorrow is a fresh start! Begin logging your meals from breakfast to get nutritional insights throughout the day.";
      }
      
      return res.json({
        analysis: noMealsMessage,
        date,
        meals_count: 0,
        timing_context: {
          current_time: currentTime,
          last_meal_time: 'No meals yet',
          day_progress: dayProgress,
          day_phase: dayPhase,
          analysis_generated_at: now.toISOString()
        }
      });
    }
    
    // Prepare data for AI analysis
    const totalsText = `Calories: ${totals.total_calories || 0}, Protein: ${totals.total_protein || 0}g, Fat: ${totals.total_fat || 0}g, Carbs: ${totals.total_carbs || 0}g, Fiber: ${totals.total_fiber || 0}g`;
    
    const mealsText = meals.map((meal, index) => {
      const time = meal.created_at ? new Date(meal.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: userTimezone
      }) : 'Unknown time';
      return `${index + 1}. ${time} - ${meal.description} (${meal.calories}cal, ${meal.protein}g protein, ${meal.fat}g fat, ${meal.carbs}g carbs, ${meal.fiber}g fiber)`;
    }).join('\n');
    
    // Find the most recent meal (timing context already calculated above)
    const lastMeal = meals.length > 0 ? meals[0] : null; // meals are ordered by created_at DESC
    const lastMealTime = lastMeal && lastMeal.created_at ? 
      new Date(lastMeal.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: userTimezone
      }) : 'No meals yet';
    
    // Prepare the prompt with timing context
    const prompt = nutritionistPrompt
      .replace('{{date}}', date)
      .replace('{{totals}}', totalsText)
      .replace('{{meals}}', mealsText)
      .replace('{{current_time}}', currentTime)
      .replace('{{last_meal_time}}', lastMealTime)
      .replace('{{day_progress}}', dayPhase);
    
    // Generate analysis using Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent([{ text: prompt }]);
    const response = await result.response;
    const analysis = response.text();
    
    res.json({
      analysis,
      date,
      meals_count: meals.length,
      totals,
      timing_context: {
        current_time: currentTime,
        last_meal_time: lastMealTime,
        day_progress: dayProgress,
        day_phase: dayPhase,
        analysis_generated_at: now.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error generating nutritionist analysis:', error);
    
    // Check if it's a quota exceeded error
    if (error.message && error.message.includes('429') || error.message.includes('quota')) {
      res.status(200).json({ 
        error: 'Quota exceeded',
        analysis: "📊 **Daily AI Analysis Quota Exceeded** \n\n✅ Your meal was saved successfully!\n\n⏳ The AI nutritionist analysis is temporarily unavailable due to reaching the daily quota limit (50 requests/day for free tier).\n\n🔄 **Options:**\n- Wait until tomorrow for quota reset\n- Upgrade to paid Gemini API plan for higher limits\n- Your nutrition data is still being tracked!\n\n💡 All your meals and totals are working perfectly."
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate nutritionist analysis',
        analysis: "⚠️ **Analysis temporarily unavailable** \n\nUnable to generate nutritional insights at the moment. Please try again later."
      });
    }
  }
});

// Get history
app.get('/api/history', (req, res) => {
  db.all(`SELECT * FROM daily_totals ORDER BY date DESC LIMIT 30`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get meals for specific date
app.get('/api/meals/:date', (req, res) => {
  const { date } = req.params;
  
  db.all(`SELECT * FROM meals WHERE date = ? ORDER BY created_at DESC`, [date], (err, meals) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const mealsWithParsedImages = meals.map(meal => ({
      ...meal,
      image_paths: meal.image_paths ? JSON.parse(meal.image_paths) : []
    }));
    
    db.get(`SELECT * FROM daily_totals WHERE date = ?`, [date], (err, totals) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        date,
        meals: mealsWithParsedImages,
        totals: totals || {
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          total_fiber: 0
        }
      });
    });
  });
});

// Start new day (optional - can be used to manually trigger daily reset)
app.post('/api/new-day', (req, res) => {
  const date = getCurrentDate();
  
  // Trigger the same logic as automatic new day
  handleAutomaticNewDay();
  
  res.json({ 
    message: 'New day started manually', 
    date,
    timestamp: new Date().toISOString()
  });
});

// Get scheduler status
app.get('/api/scheduler-status', (req, res) => {
  const now = new Date();
  const currentDate = getCurrentDate();
  
  // Calculate next midnight
  const nextMidnight = new Date(now);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  const timeToMidnight = nextMidnight.getTime() - now.getTime();
  const hoursToMidnight = Math.floor(timeToMidnight / (1000 * 60 * 60));
  const minutesToMidnight = Math.floor((timeToMidnight % (1000 * 60 * 60)) / (1000 * 60));
  
  res.json({
    current_date: currentDate,
    current_time: now.toISOString(),
    scheduler_active: true,
    next_new_day: nextMidnight.toISOString(),
    time_until_next_transition: `${hoursToMidnight}h ${minutesToMidnight}m`,
    timezone: process.env.TZ || 'America/New_York'
  });
});

// Export CSV
app.get('/api/export/csv', (req, res) => {
  db.all(`SELECT * FROM daily_totals ORDER BY date DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    let csv = 'Date,Calories,Protein,Fat,Carbs,Fiber\n';
    rows.forEach(row => {
      csv += `${row.date},${row.total_calories},${row.total_protein},${row.total_fat},${row.total_carbs},${row.total_fiber}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meal_history.csv"');
    res.send(csv);
  });
});

// Export all meals as CSV
app.get('/api/export/meals-csv', (req, res) => {
  db.all(`SELECT * FROM meals ORDER BY date DESC, created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    let csv = 'Date,Time,Description,Calories,Protein,Fat,Carbs,Fiber,Input Method,Nutrition Source\n';
    rows.forEach(row => {
      const date = row.date || '';
      const time = row.created_at ? new Date(row.created_at).toLocaleTimeString('en-US', { hour12: false }) : '';
      const desc = (row.description || '').replace(/"/g, '""');
      const calories = row.calories || 0;
      const protein = row.protein || 0;
      const fat = row.fat || 0;
      const carbs = row.carbs || 0;
      const fiber = row.fiber || 0;
      const inputMethod = row.input_method || '';
      const nutritionSource = row.nutrition_source || '';
      csv += `"${date}","${time}","${desc}",${calories},${protein},${fat},${carbs},${fiber},"${inputMethod}","${nutritionSource}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meals_history.csv"');
    res.send(csv);
  });
});

// Delete meal
app.delete('/api/meals/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`SELECT date, image_paths FROM meals WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    const date = row.date;
    const imagePaths = row.image_paths ? JSON.parse(row.image_paths) : [];
    
    db.run(`DELETE FROM meals WHERE id = ?`, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Clean up image files
      imagePaths.forEach(imagePath => {
        if (imagePath && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
            console.log(`Deleted image file: ${imagePath}`);
          } catch (fileErr) {
            console.error(`Error deleting image file ${imagePath}:`, fileErr);
          }
        }
      });
      
      updateDailyTotals(date, (err) => {
        if (err) console.error('Error updating daily totals:', err);
      });
      
      res.json({ message: 'Meal deleted successfully' });
    });
  });
});

// Delete all history
app.delete('/api/history', (req, res) => {
  db.serialize(() => {
    let mealError, totalError;

    db.run(`DELETE FROM meals`, [], function(err) {
      if (err) mealError = err;
    });

    db.run(`DELETE FROM daily_totals`, [], function(err) {
      if (err) totalError = err;
    });

    if (mealError || totalError) {
      console.error('Error clearing history:', { mealError, totalError });
      return res.status(500).json({ error: 'Failed to clear complete history.' });
    }
    
    console.log(`✅ All meal and daily total history has been cleared.`);
    res.json({ message: 'History cleared successfully' });
  });
});

// Recalculate meal nutrition data
app.post('/api/meals/:id/recalculate', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPrompt } = req.body;
    
    if (!newPrompt) {
      return res.status(400).json({ error: 'New prompt is required' });
    }
    
    // Get the existing meal data
    db.get(`SELECT * FROM meals WHERE id = ?`, [id], async (err, meal) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!meal) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      // Parse existing image paths
      const imagePaths = meal.image_paths ? JSON.parse(meal.image_paths) : [];
      const primaryImagePath = imagePaths.length > 0 ? imagePaths[0] : null;
      
      // Recalculate nutrition with new prompt
      const nutritionData = await analyzeFoodWithHybridSearch(newPrompt, primaryImagePath);
      
      // Update the meal with new data
      db.run(`UPDATE meals SET 
        description = ?, calories = ?, protein = ?, fat = ?, carbs = ?, fiber = ?, 
        original_prompt = ?, nutrition_source = ?
        WHERE id = ?`,
        [nutritionData.description, nutritionData.calories, nutritionData.protein,
         nutritionData.fat, nutritionData.carbs, nutritionData.fiber, 
         newPrompt, nutritionData.source || 'unknown', id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Update daily totals
          updateDailyTotals(meal.date, (err) => {
            if (err) console.error('Error updating daily totals:', err);
          });
          
          res.json({ 
            message: 'Meal recalculated successfully',
            nutritionData: { // Send totals
              calories: nutritionData.calories,
              protein: nutritionData.protein,
              fat: nutritionData.fat,
              carbs: nutritionData.carbs,
              fiber: nutritionData.fiber,
              description: nutritionData.description
            },
            nutritionDetails: nutritionData.ingredients, // Send transient breakdown
            originalPrompt: newPrompt,
            nutritionSource: nutritionData.source || 'unknown'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error recalculating meal:', error);
    res.status(500).json({ error: 'Failed to recalculate meal' });
  }
});

// Serve uploaded files (images)
app.use('/uploads', express.static('uploads'));

// Function to handle automatic new day transition
function handleAutomaticNewDay() {
  const currentDate = getCurrentDate();
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: timezone
  });
  
  console.log(`🌅 Automatic new day transition triggered at ${timeString} for date: ${currentDate}`);
  
  // Log the transition
  console.log(`📅 Welcome to ${new Date(currentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  })}!`);
  
  // Note: Daily totals will be initialized automatically when users add their first meal of the day
  // No need to pre-create entries since we now have user-specific data
  console.log(`✅ New day ready - daily totals will be created when users add their first meals`);
}

// Schedule automatic new day at midnight (00:00) every day
// Cron format: second minute hour day month weekday
// '0 0 * * *' = At 00:00 (midnight) every day
const timezone = process.env.TIMEZONE || process.env.TZ || 'America/New_York';
cron.schedule('0 0 * * *', () => {
  handleAutomaticNewDay();
}, {
  timezone: timezone
});

console.log(`⏰ Automatic new day scheduler initialized - will trigger at midnight daily (${timezone})`);

// Initialize vector service on startup - DISABLED
// foodVectorService.initialize().catch(error => {
//   console.warn('Vector service initialization failed:', error.message);
//   console.log('Continuing with AI-only mode...');
// });
console.log('Vector service initialization disabled - running in AI-only mode');

// Update meal nutrition and/or image
app.patch('/api/meals/:id', upload.array('photos', 10), (req, res) => {
  const { id } = req.params;
  const { calories, protein, fat, carbs, fiber, description } = req.body;
  const photos = req.files || [];

  db.get('SELECT * FROM meals WHERE id = ?', [id], (err, meal) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    // Prepare new image paths if any
    let imagePaths = meal.image_paths ? JSON.parse(meal.image_paths) : [];
    if (photos.length > 0) {
      imagePaths = photos.map(photo => photo.path);
    }

    // Build update query dynamically
    const fields = [];
    const values = [];
    if (typeof calories !== 'undefined') { fields.push('calories = ?'); values.push(Number(calories)); }
    if (typeof protein !== 'undefined') { fields.push('protein = ?'); values.push(Number(protein)); }
    if (typeof fat !== 'undefined') { fields.push('fat = ?'); values.push(Number(fat)); }
    if (typeof carbs !== 'undefined') { fields.push('carbs = ?'); values.push(Number(carbs)); }
    if (typeof fiber !== 'undefined') { fields.push('fiber = ?'); values.push(Number(fiber)); }
    if (typeof description !== 'undefined') { fields.push('description = ?'); values.push(description); }
    if (photos.length > 0) { fields.push('image_paths = ?'); values.push(JSON.stringify(imagePaths)); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    values.push(1);
    const sql = `UPDATE meals SET ${fields.join(', ')} WHERE id = ?`;
    values.pop(); // Remove the user_id value
    db.run(sql, values, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Update daily totals
      updateDailyTotals(meal.date, (err) => {
        if (err) console.error('Error updating daily totals:', err);
      });
      res.json({ message: 'Meal updated successfully' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Make sure to set your GEMINI_API_KEY in a .env file`);
  console.log(`🌅 Automatic new day transitions enabled at midnight`);
}); 