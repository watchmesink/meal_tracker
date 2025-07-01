const { VectorFoodDatabase } = require('./scripts/setup-vector-db');

function calculateNutritionCompleteness(food) {
    const requiredNutrients = ['calories', 'protein', 'fat', 'carbs'];
    let foundNutrients = 0;
    
    if (!food) return 0;

    for (const nutrient of requiredNutrients) {
        if (food[nutrient] !== null && food[nutrient] !== undefined && food[nutrient] > 0) {
            foundNutrients++;
        }
    }
    
    return requiredNutrients.length > 0 ? (foundNutrients / requiredNutrients.length) : 0;
}

class FoodVectorService {
  constructor() {
    this.vectorDB = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing Food Vector Service...');
    
    try {
      this.vectorDB = new VectorFoodDatabase();
      await this.vectorDB.initialize();
      await this.vectorDB.loadNutrients();
      await this.vectorDB.loadFoodNutrients();
      
      this.isInitialized = true;
      console.log('Food Vector Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Food Vector Service:', error);
      throw error;
    }
  }

  async searchSimilarFoods(query, limit = 5, minSimilarity = 0.7) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const results = await this.vectorDB.searchSimilarFoods(query, limit * 2); // Get more candidates
      
      // Score and rank results based on similarity and nutrition completeness
      const scoredResults = results.map(result => {
        const nutrition = result.nutrition;
        
        // Calculate nutrition completeness score (0-1)
        let completenessScore = 0;
        if (nutrition.calories > 0) completenessScore += 0.3;
        if (nutrition.protein > 0) completenessScore += 0.2;
        if (nutrition.fat >= 0) completenessScore += 0.2; // Fat can be 0
        if (nutrition.carbs >= 0) completenessScore += 0.2; // Carbs can be 0
        if (nutrition.fiber >= 0) completenessScore += 0.1; // Fiber can be 0
        
        // Combined score: 70% similarity + 30% completeness
        const combinedScore = (result.similarity * 0.7) + (completenessScore * 0.3);
        
        return {
          ...result,
          completenessScore,
          combinedScore
        };
      });
      
      // Sort by combined score and filter
      const filteredResults = scoredResults
        .filter(result => result.similarity >= minSimilarity && result.combinedScore > 0.6)
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);
      
      return filteredResults;
    } catch (error) {
      console.error('Error searching similar foods:', error);
      return [];
    }
  }

  async analyzeFood(description, imagePath = null) {
    try {
      if (!this.vectorDB) {
        console.warn('Vector DB not initialized, skipping analysis.');
        return null;
      }

      const similarFoods = await this.searchSimilarFoods(description, 1, 0.3);

      if (similarFoods && similarFoods.length > 0) {
        const bestMatch = similarFoods[0];
        const nutrition = bestMatch.nutrition;
        const completeness = bestMatch.completenessScore;
        const similarity = bestMatch.similarity;

        return {
          calories: nutrition.calories || 0,
          protein: nutrition.protein || 0,
          fat: nutrition.fat || 0,
          carbs: nutrition.carbs || 0,
          fiber: nutrition.fiber || 0,
          matched_food: bestMatch.description,
          similarity: similarity,
          nutrition_completeness: completeness,
          source: 'usda_vector_search',
          description: description
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error during vector search analysis:', err);
      return null;
    }
  }

  adjustNutritionForQuantity(description, baseNutrition) {
    // Simple quantity detection and adjustment
    const text = description.toLowerCase();
    
    // Look for quantity indicators
    const quantityMultipliers = {
      'half': 0.5,
      '1/2': 0.5,
      'quarter': 0.25,
      '1/4': 0.25,
      'double': 2.0,
      'twice': 2.0,
      '2 cups': 2.0,
      '3 cups': 3.0,
      '2 pieces': 1.5,
      '3 pieces': 2.0,
      'large': 1.3,
      'small': 0.7,
      'tiny': 0.5,
      'huge': 1.5,
      'big': 1.2
    };
    
    let multiplier = 1.0;
    
    // Check for specific quantities
    for (const [keyword, mult] of Object.entries(quantityMultipliers)) {
      if (text.includes(keyword)) {
        multiplier = mult;
        break;
      }
    }
    
    // Look for number patterns like "2 slices", "3 pieces", etc.
    const numberMatch = text.match(/(\d+)\s*(slice|piece|cup|tablespoon|teaspoon|ounce|serving)/);
    if (numberMatch) {
      const number = parseInt(numberMatch[1]);
      if (number >= 1 && number <= 10) {
        multiplier = number;
      }
    }
    
    // Apply multiplier to nutrition values
    return {
      calories: Math.round(baseNutrition.calories * multiplier),
      protein: Math.round(baseNutrition.protein * multiplier * 10) / 10,
      fat: Math.round(baseNutrition.fat * multiplier * 10) / 10,
      carbs: Math.round(baseNutrition.carbs * multiplier * 10) / 10,
      fiber: Math.round(baseNutrition.fiber * multiplier * 10) / 10
    };
  }

  async getNutritionByFdcId(fdcId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return await this.vectorDB.getNutritionByFdcId(fdcId);
  }

  // Method to check if the service has embeddings data
  async hasEmbeddingsData() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const count = await new Promise((resolve, reject) => {
        this.vectorDB.db.get("SELECT COUNT(*) as count FROM food_embeddings", (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });
      
      return count > 0;
    } catch (error) {
      console.error('Error checking embeddings data:', error);
      return false;
    }
  }
}

// Export singleton instance
const foodVectorService = new FoodVectorService();

module.exports = foodVectorService;