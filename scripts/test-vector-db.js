const { VectorFoodDatabase } = require('./setup-vector-db');

async function testVectorDatabase() {
  console.log('Starting vector database test...');
  
  try {
    const vectorDB = new VectorFoodDatabase();
    
    // Initialize the database
    await vectorDB.initialize();
    
    // Load just the nutrients and food nutrients for testing
    await vectorDB.loadNutrients();
    await vectorDB.loadFoodNutrients();
    
    console.log('Vector database loaded successfully!');
    
    // Test a simple food search without creating all embeddings first
    // We'll just search among foods that have embeddings
    const testResults = await vectorDB.searchSimilarFoods('chicken breast grilled', 3);
    
    console.log('Test search results for "chicken breast grilled":');
    if (testResults.length > 0) {
      testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.description}`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`   Calories: ${result.nutrition.calories}, Protein: ${result.nutrition.protein}g`);
        console.log(`   Fat: ${result.nutrition.fat}g, Carbs: ${result.nutrition.carbs}g, Fiber: ${result.nutrition.fiber}g`);
        console.log('');
      });
    } else {
      console.log('No results found - this is expected if no embeddings exist yet');
    }
    
    return vectorDB;
  } catch (error) {
    console.error('Error testing vector database:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testVectorDatabase()
    .then(() => {
      console.log('Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testVectorDatabase };