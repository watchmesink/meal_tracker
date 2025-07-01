const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class VectorFoodDatabase {
  constructor() {
    this.db = null;
    this.foodData = new Map(); // Store food data by fdc_id
    this.nutrientData = new Map(); // Store nutrient data by fdc_id
    this.nutrients = new Map(); // Store nutrient definitions
  }

  async initialize() {
    console.log('Initializing vector database...');
    
    // Create SQLite database for vector storage
    this.db = new sqlite3.Database('food_vectors.db');
    
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create table for food embeddings
        this.db.run(`CREATE TABLE IF NOT EXISTS food_embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fdc_id TEXT NOT NULL,
          description TEXT NOT NULL,
          embedding BLOB NOT NULL,
          food_category_id TEXT,
          data_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            reject(err);
            return;
          }
        });
        
        // Create index for faster lookups
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_fdc_id ON food_embeddings(fdc_id)`, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('Vector database initialized');
          resolve();
        });
      });
    });
  }

  async generateEmbedding(text) {
    try {
      const model = genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error(`Error generating embedding for text: ${text.substring(0, 50)}...`, error);
      // Use zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  // Helper function to calculate cosine similarity
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Helper function to serialize embedding for storage
  serializeEmbedding(embedding) {
    const buffer = Buffer.alloc(embedding.length * 4); // 4 bytes per float
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], i * 4);
    }
    return buffer;
  }

  // Helper function to deserialize embedding from storage
  deserializeEmbedding(buffer) {
    const embedding = [];
    for (let i = 0; i < buffer.length; i += 4) {
      embedding.push(buffer.readFloatLE(i));
    }
    return embedding;
  }

  async loadNutrients() {
    console.log('Loading nutrients...');
    const nutrientPath = path.join(__dirname, '../FoodData/nutrient.csv');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(nutrientPath)
        .pipe(csv())
        .on('data', (row) => {
          this.nutrients.set(row.id, {
            id: row.id,
            name: row.name,
            unit: row.unit_name,
            nutrient_nbr: row.nutrient_nbr
          });
        })
        .on('end', () => {
          console.log(`Loaded ${this.nutrients.size} nutrients`);
          resolve();
        })
        .on('error', reject);
    });
  }

  async loadFoodNutrients() {
    console.log('Loading food nutrients...');
    const foodNutrientPath = path.join(__dirname, '../FoodData/food_nutrient.csv');
    
    return new Promise((resolve, reject) => {
      let count = 0;
      fs.createReadStream(foodNutrientPath)
        .pipe(csv())
        .on('data', (row) => {
          const fdcId = row.fdc_id;
          const nutrientId = row.nutrient_id;
          const amount = parseFloat(row.amount) || 0;
          
          if (!this.nutrientData.has(fdcId)) {
            this.nutrientData.set(fdcId, {});
          }
          
          this.nutrientData.get(fdcId)[nutrientId] = amount;
          count++;
          
          if (count % 10000 === 0) {
            console.log(`Processed ${count} food-nutrient relationships...`);
          }
        })
        .on('end', () => {
          console.log(`Loaded ${count} food-nutrient relationships for ${this.nutrientData.size} foods`);
          resolve();
        })
        .on('error', reject);
    });
  }

  async loadFoodsAndCreateEmbeddings() {
    console.log('Loading foods and creating embeddings...');
    const foodPath = path.join(__dirname, '../FoodData/food.csv');
    
    // Check if embeddings already exist
    return new Promise((resolve, reject) => {
      this.db.get("SELECT COUNT(*) as count FROM food_embeddings", async (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row.count > 0) {
          console.log(`Found ${row.count} existing embeddings, skipping creation...`);
          resolve();
          return;
        }
        
        // Process foods and create embeddings
        const foods = [];
        
        fs.createReadStream(foodPath)
          .pipe(csv())
          .on('data', (row) => {
            // Store food data
            this.foodData.set(row.fdc_id, {
              fdc_id: row.fdc_id,
              description: row.description,
              food_category_id: row.food_category_id,
              data_type: row.data_type,
              publication_date: row.publication_date
            });
            
            foods.push(row);
          })
          .on('end', async () => {
            console.log(`Loaded ${foods.length} foods, creating embeddings...`);
            
            try {
              // Process foods in smaller batches to avoid rate limiting
              const batchSize = 10; // Smaller batches for API rate limiting
              
              for (let i = 0; i < foods.length; i += batchSize) {
                const batch = foods.slice(i, i + batchSize);
                
                console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(foods.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, foods.length)} of ${foods.length})`);
                
                // Process each food in the batch
                for (const food of batch) {
                  const embedding = await this.generateEmbedding(food.description);
                  const embeddingBuffer = this.serializeEmbedding(embedding);
                  
                  // Store in database
                  await new Promise((resolve, reject) => {
                    this.db.run(
                      `INSERT INTO food_embeddings (fdc_id, description, embedding, food_category_id, data_type)
                       VALUES (?, ?, ?, ?, ?)`,
                      [food.fdc_id, food.description, embeddingBuffer, food.food_category_id, food.data_type],
                      function(err) {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                }
                
                // Add delay between batches to respect API rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              console.log('Successfully created embeddings for all foods');
              resolve();
            } catch (error) {
              console.error('Error creating embeddings:', error);
              reject(error);
            }
          })
          .on('error', reject);
      });
    });
  }

  async searchSimilarFoods(query, limit = 5) {
    if (!this.db) {
      throw new Error('Vector database not initialized');
    }
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get all embeddings from database
      const allEmbeddings = await new Promise((resolve, reject) => {
        this.db.all("SELECT fdc_id, description, embedding, food_category_id, data_type FROM food_embeddings", 
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Calculate similarities
      const similarities = [];
      
      for (const row of allEmbeddings) {
        const embedding = this.deserializeEmbedding(row.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        
        similarities.push({
          fdc_id: row.fdc_id,
          description: row.description,
          similarity: similarity,
          food_category_id: row.food_category_id,
          data_type: row.data_type
        });
      }
      
      // Sort by similarity and take top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topResults = similarities.slice(0, limit);
      
      // Enhance results with nutritional data
      const enhancedResults = [];
      
      for (const result of topResults) {
        const nutrients = this.nutrientData.get(result.fdc_id) || {};
        
        // Extract key nutrients (calories, protein, fat, carbs, fiber)
        const nutritionInfo = {
          calories: nutrients['1008'] || nutrients['2047'] || nutrients['2048'] || 0, // Energy
          protein: nutrients['1003'] || 0, // Protein
          fat: nutrients['1004'] || 0, // Total lipid (fat)
          carbs: nutrients['1005'] || 0, // Carbohydrate, by difference
          fiber: nutrients['1079'] || 0 // Fiber, total dietary
        };
        
        enhancedResults.push({
          fdc_id: result.fdc_id,
          description: result.description,
          similarity: result.similarity,
          nutrition: nutritionInfo,
          food_category_id: result.food_category_id,
          data_type: result.data_type
        });
      }
      
      return enhancedResults;
    } catch (error) {
      console.error('Error searching similar foods:', error);
      return [];
    }
  }

  async getNutritionByFdcId(fdcId) {
    const nutrients = this.nutrientData.get(fdcId) || {};
    return {
      calories: nutrients['1008'] || nutrients['2047'] || nutrients['2048'] || 0,
      protein: nutrients['1003'] || 0,
      fat: nutrients['1004'] || 0,
      carbs: nutrients['1005'] || 0,
      fiber: nutrients['1079'] || 0
    };
  }
}

// Main setup function
async function setupVectorDatabase() {
  console.log('Starting vector database setup...');
  
  try {
    const vectorDB = new VectorFoodDatabase();
    
    // Initialize the database
    await vectorDB.initialize();
    
    // Load all the data
    await vectorDB.loadNutrients();
    await vectorDB.loadFoodNutrients();
    await vectorDB.loadFoodsAndCreateEmbeddings();
    
    console.log('Vector database setup complete!');
    
    // Test the search functionality
    console.log('\nTesting search functionality...');
    const testResults = await vectorDB.searchSimilarFoods('chicken breast grilled', 3);
    
    console.log('Test search results for "chicken breast grilled":');
    testResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.description}`);
      console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   Calories: ${result.nutrition.calories}, Protein: ${result.nutrition.protein}g`);
      console.log(`   Fat: ${result.nutrition.fat}g, Carbs: ${result.nutrition.carbs}g, Fiber: ${result.nutrition.fiber}g`);
      console.log('');
    });
    
    return vectorDB;
  } catch (error) {
    console.error('Error setting up vector database:', error);
    throw error;
  }
}

// Export for use in other modules
module.exports = { VectorFoodDatabase, setupVectorDatabase };

// Run setup if this file is executed directly
if (require.main === module) {
  setupVectorDatabase()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}