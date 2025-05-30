
import { WeeklyPlan, Recipe, Ingredient, ShoppingListItem, RecipeCategory } from '../types';

// Helper to attempt parsing quantity string into a number
const parseQuantity = (quantityStr: string): number => {
  const firstPart = quantityStr.split(' ')[0].replace(',', '.');
  const num = parseFloat(firstPart);
  return isNaN(num) ? 0 : num; // Return 0 if not a number, so it doesn't break summing
};

// Helper to extract unit string
const getUnit = (quantityStr: string): string => {
    const parts = quantityStr.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
};


export const generateShoppingList = (weeklyPlan: WeeklyPlan, recipes: Recipe[]): ShoppingListItem[] => {
  const aggregatedIngredients: { [key: string]: ShoppingListItem } = {};

  Object.values(weeklyPlan).flat().forEach(plannedMeal => {
    if (!plannedMeal.recipeId) return; // Skip custom meals

    const recipe = recipes.find(r => r.id === plannedMeal.recipeId);
    if (!recipe) return; // Skip if recipe not found

    const servingsMultiplier = plannedMeal.servings; // Assuming base recipe is for 1 person or ingredients are per person

    recipe.ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;
      
      const currentQuantityNum = parseQuantity(ingredient.quantity);
      const quantityToAdd = currentQuantityNum * servingsMultiplier;

      if (aggregatedIngredients[key]) {
        const existingQuantityNum = parseQuantity(aggregatedIngredients[key].quantity);
        aggregatedIngredients[key].quantity = `${existingQuantityNum + quantityToAdd} ${ingredient.unit}`; // Keep unit consistent
        if (!aggregatedIngredients[key].recipeSources.includes(recipe.title)) {
            aggregatedIngredients[key].recipeSources.push(recipe.title);
        }
      } else {
        aggregatedIngredients[key] = {
          id: crypto.randomUUID(),
          name: ingredient.name,
          quantity: `${quantityToAdd} ${ingredient.unit}`,
          unit: ingredient.unit,
          category: recipe.category, // Use recipe category as a proxy for ingredient category
          checked: false,
          recipeSources: [recipe.title]
        };
      }
    });
  });

  // Group by category for display
  const groupedAndSortedList = Object.values(aggregatedIngredients).sort((a, b) => {
    const categoryOrder = Object.values(RecipeCategory); // Assuming RecipeCategory enum defines order
    const catAIndex = categoryOrder.indexOf(a.category as RecipeCategory);
    const catBIndex = categoryOrder.indexOf(b.category as RecipeCategory);

    if (catAIndex !== catBIndex) {
      return catAIndex - catBIndex;
    }
    return a.name.localeCompare(b.name);
  });
  
  return groupedAndSortedList;
};
    