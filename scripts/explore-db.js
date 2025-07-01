const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('meal_tracker.db');

console.log('🗄️ Meal Tracker Database Explorer\n');

// Database statistics
function getStats() {
  return new Promise((resolve) => {
    db.get(`SELECT 
      (SELECT COUNT(*) FROM meals) as total_meals,
      (SELECT COUNT(*) FROM daily_totals) as total_days,
      (SELECT COUNT(*) FROM audio_recordings) as total_audio_recordings,
      (SELECT COUNT(*) FROM meals WHERE audio_path IS NOT NULL) as meals_with_audio,
      (SELECT COUNT(*) FROM meals WHERE json_array_length(image_paths) > 0) as meals_with_photos
    `, (err, row) => {
      if (err) {
        console.error('Error:', err);
        resolve(null);
      } else {
        resolve(row);
      }
    });
  });
}

// Recent meals
function getRecentMeals() {
  return new Promise((resolve) => {
    db.all(`SELECT 
      id, date, description, calories, protein, fat, carbs, fiber,
      input_method, audio_path, transcription,
      json_array_length(image_paths) as photo_count,
      created_at
    FROM meals 
    ORDER BY created_at DESC 
    LIMIT 10`, (err, rows) => {
      if (err) {
        console.error('Error:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
}

// Daily totals
function getDailyTotals() {
  return new Promise((resolve) => {
    db.all(`SELECT date, total_calories, total_protein, total_fat, total_carbs, total_fiber 
    FROM daily_totals 
    ORDER BY date DESC 
    LIMIT 7`, (err, rows) => {
      if (err) {
        console.error('Error:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
}

// Audio recordings
function getAudioRecordings() {
  return new Promise((resolve) => {
    db.all(`SELECT 
      ar.id, ar.meal_id, ar.original_filename, ar.file_size, 
      ar.transcription, ar.created_at,
      m.description as meal_description
    FROM audio_recordings ar
    LEFT JOIN meals m ON ar.meal_id = m.id
    ORDER BY ar.created_at DESC
    LIMIT 5`, (err, rows) => {
      if (err) {
        console.error('Error:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
}

// Main function
async function explore() {
  try {
    // Database Statistics
    const stats = await getStats();
    if (stats) {
      console.log('📊 Database Statistics:');
      console.log(`   Total Meals: ${stats.total_meals}`);
      console.log(`   Total Days Tracked: ${stats.total_days}`);
      console.log(`   Audio Recordings: ${stats.total_audio_recordings}`);
      console.log(`   Meals with Audio: ${stats.meals_with_audio}`);
      console.log(`   Meals with Photos: ${stats.meals_with_photos}`);
      console.log('');
    }

    // Recent Meals
    const recentMeals = await getRecentMeals();
    if (recentMeals.length > 0) {
      console.log('🍽️ Recent Meals:');
      recentMeals.forEach(meal => {
        const audioIcon = meal.audio_path ? '🎤' : '';
        const photoIcon = meal.photo_count > 0 ? '📷' : '';
        const methodIcon = {
          'text': '📝',
          'photo': '📷',
          'audio': '🎤',
          'text_photo': '📝📷'
        }[meal.input_method] || '📝';
        
        console.log(`   ${methodIcon} ${audioIcon}${photoIcon} ${meal.description}`);
        console.log(`      ${meal.calories} cal | ${meal.protein}g protein | ${meal.date} | ID: ${meal.id}`);
        if (meal.transcription) {
          console.log(`      Transcription: "${meal.transcription}"`);
        }
        console.log('');
      });
    } else {
      console.log('🍽️ No meals found - start tracking to see data here!\n');
    }

    // Daily Totals
    const dailyTotals = await getDailyTotals();
    if (dailyTotals.length > 0) {
      console.log('📅 Daily Totals (Last 7 Days):');
      dailyTotals.forEach(day => {
        console.log(`   ${day.date}: ${day.total_calories} cal | ${day.total_protein}g protein | ${day.total_fat}g fat | ${day.total_carbs}g carbs`);
      });
      console.log('');
    }

    // Audio Recordings
    const audioRecordings = await getAudioRecordings();
    if (audioRecordings.length > 0) {
      console.log('🎤 Recent Audio Recordings:');
      audioRecordings.forEach(recording => {
        const sizeKB = Math.round(recording.file_size / 1024);
        console.log(`   ${recording.original_filename} (${sizeKB}KB)`);
        console.log(`      Meal: ${recording.meal_description}`);
        console.log(`      Transcription: "${recording.transcription}"`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error exploring database:', error);
  } finally {
    db.close();
  }
}

// Run the explorer
explore(); 