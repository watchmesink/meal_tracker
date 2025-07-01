const { VectorFoodDatabase } = require('./setup-vector-db');

async function testSpecificFood() {
  console.log('Testing specific food nutrition...');
  
  const vectorDB = new VectorFoodDatabase();
  await vectorDB.initialize();
  await vectorDB.loadNutrients();
  await vectorDB.loadFoodNutrients();
  
  console.log('Testing FDC ID 321358 (Commercial Hummus)');
  const rawNutrients = vectorDB.nutrientData.get('321358');
  
  if (rawNutrients) {
    console.log('Found nutrients! Total nutrients:', Object.keys(rawNutrients).length);
    console.log('First 10 nutrient IDs:', Object.keys(rawNutrients).slice(0, 10));
    
    // Check specific nutrients
    console.log(`Energy (1008): ${rawNutrients['1008'] || 'NOT FOUND'}`);
    console.log(`Protein (1003): ${rawNutrients['1003'] || 'NOT FOUND'}`);
    console.log(`Fat (1004): ${rawNutrients['1004'] || 'NOT FOUND'}`);
    console.log(`Carbs (1005): ${rawNutrients['1005'] || 'NOT FOUND'}`);
    console.log(`Fiber (1079): ${rawNutrients['1079'] || 'NOT FOUND'}`);
    
    const nutrition = await vectorDB.getNutritionByFdcId('321358');
    console.log('Final nutrition data:', nutrition);
  } else {
    console.log('No nutrients found for 321358');
  }
}

testSpecificFood().catch(console.error); 