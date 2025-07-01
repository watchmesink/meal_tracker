const { VectorFoodDatabase } = require('./setup-vector-db');

(async () => {
  const vectorDB = new VectorFoodDatabase();
  await vectorDB.initialize();
  await vectorDB.loadNutrients();
  await vectorDB.loadFoodNutrients();
  
  console.log('Testing commercial hummus search...');
  const results = await vectorDB.searchSimilarFoods('commercial hummus', 3);
  
  console.log('Commercial hummus search results:');
  results.forEach((r, i) => {
    console.log(`${i+1}. ${r.description}`);
    console.log(`   FDC: ${r.fdc_id} | Similarity: ${(r.similarity*100).toFixed(1)}%`);
    console.log(`   Calories: ${r.nutrition.calories}, Protein: ${r.nutrition.protein}g`);
    console.log(`   Fat: ${r.nutrition.fat}g, Carbs: ${r.nutrition.carbs}g, Fiber: ${r.nutrition.fiber}g`);
    console.log('');
  });
  
  console.log('\nAlso testing: grilled chicken breast...');
  const chickenResults = await vectorDB.searchSimilarFoods('grilled chicken breast', 3);
  
  console.log('Chicken results:');
  chickenResults.forEach((r, i) => {
    console.log(`${i+1}. ${r.description}`);
    console.log(`   FDC: ${r.fdc_id} | Similarity: ${(r.similarity*100).toFixed(1)}%`);
    console.log(`   Calories: ${r.nutrition.calories}, Protein: ${r.nutrition.protein}g`);
    console.log(`   Fat: ${r.nutrition.fat}g, Carbs: ${r.nutrition.carbs}g, Fiber: ${r.nutrition.fiber}g`);
    console.log('');
  });
})(); 