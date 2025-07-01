const { VectorFoodDatabase } = require('./setup-vector-db');

async function createSampleEmbeddings() {
  console.log('Creating sample embeddings for testing...');
  
  try {
    const vectorDB = new VectorFoodDatabase();
    
    // Initialize the database
    await vectorDB.initialize();
    
    // Load nutrient data
    await vectorDB.loadNutrients();
    await vectorDB.loadFoodNutrients();
    
    // Sample foods to create embeddings for (chicken-related foods)
    const sampleFoods = [
      'Chicken, broiler, breast, skinless, boneless, meat only, cooked, grilled',
      'Chicken, broiler, breast, skinless, boneless, meat only, raw',
      'Chicken, broiler, thigh, skinless, boneless, meat only, cooked, grilled',
      'Chicken, broiler, wing, meat and skin, cooked, roasted',
      'Rice, white, long-grain, regular, cooked',
      'Broccoli, raw',
      'Salmon, Atlantic, farmed, cooked, dry heat',
      'Egg, whole, cooked, hard-boiled',
      'Bread, whole-wheat, commercially prepared',
      'Apple, raw, with skin'
    ];
    
    console.log(`Creating embeddings for ${sampleFoods.length} sample foods...`);
    
    for (let i = 0; i < sampleFoods.length; i++) {
      const foodDescription = sampleFoods[i];
      console.log(`Processing ${i + 1}/${sampleFoods.length}: ${foodDescription}`);
      
      // Generate embedding
      const embedding = await vectorDB.generateEmbedding(foodDescription);
      const embeddingBuffer = vectorDB.serializeEmbedding(embedding);
      
      // Store in database with fake fdc_id for testing
      await new Promise((resolve, reject) => {
        vectorDB.db.run(
          `INSERT OR REPLACE INTO food_embeddings (fdc_id, description, embedding, food_category_id, data_type)
           VALUES (?, ?, ?, ?, ?)`,
          [`sample_${i + 1}`, foodDescription, embeddingBuffer, '9', 'sample'],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Sample embeddings created successfully!');
    
    // Test search functionality
    console.log('\nTesting search functionality...');
    const testQueries = [
      'grilled chicken breast',
      'cooked rice',
      'fresh fruit',
      'salmon fish'
    ];
    
    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      const results = await vectorDB.searchSimilarFoods(query, 3);
      
      if (results.length > 0) {
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.description}`);
          console.log(`     Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        });
      } else {
        console.log('  No results found');
      }
    }
    
    return vectorDB;
  } catch (error) {
    console.error('Error creating sample embeddings:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createSampleEmbeddings()
    .then(() => {
      console.log('\nSample embeddings creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nSample embeddings creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createSampleEmbeddings };