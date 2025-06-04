
import { WeeklyPlan, Recipe, Ingredient, ShoppingListItem } from '../types'; // Removed RecipeCategory as it's now RecipeCategoryDB

const parseQuantity = (quantityStr: string): number => {
  const firstPart = quantityStr.split(' ')[0].replace(',', '.');
  const num = parseFloat(firstPart);
  return isNaN(num) ? 0 : num;
};

// const getUnit = (quantityStr: string): string => {
//     const parts = quantityStr.split(' ');
//     return parts.length > 1 ? parts.slice(1).join(' ') : '';
// };

export const generateShoppingList = (weeklyPlan: WeeklyPlan, recipes: Recipe[]): ShoppingListItem[] => {
  const aggregatedIngredients: { [key: string]: ShoppingListItem } = {};

  Object.values(weeklyPlan).flat().forEach(plannedMeal => {
    if (!plannedMeal.recipe_id) return;

    const recipe = recipes.find(r => r.id === plannedMeal.recipe_id);
    if (!recipe) return;

    // Servings multiplier logic needs re-evaluation.
    // Old: plannedMeal.servings. New: plannedMeal.person (string) or recipe.persons (string[])
    // For now, assume recipe ingredients are for the whole dish as specified, multiplier is 1.
    // If a recipe is for 4 people (e.g. recipe.persons.length === 4) and ingredients are for 4,
    // and planner plans it for "Michal", it's still that whole dish.
    // The prompt didn't specify quantity adjustments for the new 'person' field. Defaulting to 1.
    const servingsMultiplier = 1; 

    recipe.ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;
      
      const currentQuantityNum = parseQuantity(ingredient.quantity);
      const quantityToAdd = currentQuantityNum * servingsMultiplier;

      if (quantityToAdd === 0 && !ingredient.quantity.toLowerCase().includes("do smaku") && !ingredient.quantity.toLowerCase().includes("szczypta")) { // Avoid adding zero quantity unless it's "to taste" etc.
          // console.warn(`Parsed zero quantity for ingredient: ${ingredient.name} (${ingredient.quantity}) from recipe ${recipe.title}. Skipping.`);
          // return; // Or handle as 1 if it's a non-numeric like "1 opakowanie" that parses to 0
      }


      if (aggregatedIngredients[key]) {
        const existingQuantityNum = parseQuantity(aggregatedIngredients[key].quantity);
        aggregatedIngredients[key].quantity = `${existingQuantityNum + quantityToAdd} ${ingredient.unit}`;
        if (!aggregatedIngredients[key].recipeSources.includes(recipe.title)) {
            aggregatedIngredients[key].recipeSources.push(recipe.title);
        }
      } else {
        aggregatedIngredients[key] = {
          id: crypto.randomUUID(),
          name: ingredient.name,
          quantity: `${quantityToAdd || ingredient.quantity} ${ingredient.unit}`, // If quantityToAdd is 0, use original string
          unit: ingredient.unit,
          category_id: recipe.category_id, 
          category_name: recipe.category_name || 'Inne', // Use mapped category_name
          checked: false,
          recipeSources: [recipe.title]
        };
      }
    });
  });

  // Group by category_name for display
  const groupedAndSortedList = Object.values(aggregatedIngredients).sort((a, b) => {
    // Simple sort by category name, then item name
    const catComp = (a.category_name || 'Inne').localeCompare(b.category_name || 'Inne');
    if (catComp !== 0) return catComp;
    return a.name.localeCompare(b.name);
  });
  
  return groupedAndSortedList;
};
