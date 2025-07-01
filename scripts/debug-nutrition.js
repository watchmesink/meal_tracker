const { VectorFoodDatabase } = require('./setup-vector-db');

async function debugNutrition() {
  console.log('Starting nutrition debug...');
  
  try {
    const vectorDB = new VectorFoodDatabase();
    
    // Initialize the database
    await vectorDB.initialize();
    
    // Load nutrients and food nutrients
    await vectorDB.loadNutrients();
    await vectorDB.loadFoodNutrients();
    
    console.log('Database loaded successfully!');
    
    // Get a specific FDC ID to debug
    const testResults = await vectorDB.searchSimilarFoods('chicken breast grilled', 1);
    
    if (testResults.length > 0) {
      const topResult = testResults[0];
      console.log('\n=== DEBUG INFO ===');
      console.log('Top result:', topResult.description);
      console.log('FDC ID:', topResult.fdc_id);
      
      // Check what nutrients are available for this food
      const rawNutrients = vectorDB.nutrientData.get(topResult.fdc_id);
      
      if (rawNutrients) {
        console.log('\nAvailable nutrients for this food:');
        const nutrientKeys = Object.keys(rawNutrients);
        console.log('Total nutrients available:', nutrientKeys.length);
        
        // Show first 10 nutrients
        console.log('First 10 nutrients:');
        nutrientKeys.slice(0, 10).forEach(key => {
          const nutrient = vectorDB.nutrients.get(key);
          const name = nutrient ? nutrient.name : 'Unknown';
          console.log(`  ${key}: ${rawNutrients[key]} (${name})`);
        });
        
        // Check specific nutrients we're looking for
        console.log('\nSpecific nutrients we need:');
        console.log(`Energy (1008): ${rawNutrients['1008'] || 'NOT FOUND'}`);
        console.log(`Energy Atwater General (2047): ${rawNutrients['2047'] || 'NOT FOUND'}`);
        console.log(`Energy Atwater Specific (2048): ${rawNutrients['2048'] || 'NOT FOUND'}`);
        console.log(`Protein (1003): ${rawNutrients['1003'] || 'NOT FOUND'}`);
        console.log(`Fat (1004): ${rawNutrients['1004'] || 'NOT FOUND'}`);
        console.log(`Carbs (1005): ${rawNutrients['1005'] || 'NOT FOUND'}`);
        console.log(`Fiber (1079): ${rawNutrients['1079'] || 'NOT FOUND'}`);
        
        // Check if these nutrients exist at all in the nutrients table
        console.log('\nNutrient definitions:');
        console.log(`1008: ${vectorDB.nutrients.get('1008')?.name || 'NOT FOUND'}`);
        console.log(`1003: ${vectorDB.nutrients.get('1003')?.name || 'NOT FOUND'}`);
        console.log(`1004: ${vectorDB.nutrients.get('1004')?.name || 'NOT FOUND'}`);
        console.log(`1005: ${vectorDB.nutrients.get('1005')?.name || 'NOT FOUND'}`);
        console.log(`1079: ${vectorDB.nutrients.get('1079')?.name || 'NOT FOUND'}`);
        
      } else {
        console.log('No raw nutrients found for FDC ID:', topResult.fdc_id);
      }
    } else {
      console.log('No search results found');
    }
    
  } catch (error) {
    console.error('Error in debug:', error);
    throw error;
  }
}

// Run debug
debugNutrition()
  .then(() => {
    console.log('\nDebug completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  }); 