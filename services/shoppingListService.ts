import { WeeklyPlan, Recipe, Ingredient, ShoppingListItem } from '../types'; 

const parseQuantity = (quantityStr: string): number => {
  if (typeof quantityStr !== 'string') return NaN;
  const firstPart = quantityStr.split(' ')[0].replace(',', '.');
  const num = parseFloat(firstPart);
  return isNaN(num) ? NaN : num; // Ensure NaN is returned for non-parsable strings
};

export const generateShoppingList = (weeklyPlan: WeeklyPlan, recipes: Recipe[]): ShoppingListItem[] => {
  const aggregatedIngredients: { [key: string]: ShoppingListItem } = {};

  Object.values(weeklyPlan).flat().forEach(plannedMeal => {
    if (!plannedMeal.recipe_id) return;

    const recipe = recipes.find(r => r.id === plannedMeal.recipe_id);
    if (!recipe) return;

    const servingsMultiplier = 1; // Assuming recipe ingredients are for the whole dish.

    recipe.ingredients.forEach(ingredient => {
      // Key ensures that "Mąka pszenna (kg)" is different from "Mąka pszenna (szklanka)"
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;
      
      const recipeIngredientOriginalQuantityStr = ingredient.quantity; // Original string e.g., "10 sztuk", "1", "do smaku"
      const recipeIngredientUnit = ingredient.unit; // e.g., "sztuk", "litr"

      const baseNumericValue = parseQuantity(recipeIngredientOriginalQuantityStr); // Numeric part, or NaN

      if (aggregatedIngredients[key]) { // Item already in list, try to aggregate
        const existingItem = aggregatedIngredients[key];
        const existingNumericValue = parseQuantity(existingItem.quantity); // Try to parse current aggregated quantity

        if (!isNaN(existingNumericValue) && !isNaN(baseNumericValue)) { // Both current and new are numeric
          existingItem.quantity = `${(existingNumericValue + (baseNumericValue * servingsMultiplier))} ${recipeIngredientUnit}`;
        } else {
          // Cannot sum numerically (e.g. "1 opakowanie" + "0.5 opakowania" or "do smaku" + "1 szczypta")
          // Append as a distinct part. This isn't ideal for a clean list but prevents data loss.
          // A more sophisticated approach might involve unit conversion or smarter parsing.
          existingItem.quantity = `${existingItem.quantity}; ${recipeIngredientOriginalQuantityStr}`;
          if (recipeIngredientUnit && !existingItem.quantity.includes(recipeIngredientUnit)) {
            existingItem.quantity += ` ${recipeIngredientUnit}`;
          }
        }
        if (!existingItem.recipeSources.includes(recipe.title)) {
            existingItem.recipeSources.push(recipe.title);
        }
      } else { // New item for the list
        let initialFullQuantityString;
        if (!isNaN(baseNumericValue)) { // If original quantity is numeric or starts with a number
          initialFullQuantityString = `${baseNumericValue * servingsMultiplier} ${recipeIngredientUnit}`;
        } else { // Non-numeric quantity string like "do smaku", "1 puszka"
          initialFullQuantityString = recipeIngredientOriginalQuantityStr;
          // If unit is provided and not already part of the quantity string, append it
          if (recipeIngredientUnit && !initialFullQuantityString.toLowerCase().includes(recipeIngredientUnit.toLowerCase())) {
            initialFullQuantityString = `${initialFullQuantityString} ${recipeIngredientUnit}`;
          }
        }
        
        aggregatedIngredients[key] = {
          id: crypto.randomUUID(),
          name: ingredient.name,
          quantity: initialFullQuantityString.trim(), // Ensure no leading/trailing spaces
          unit: recipeIngredientUnit, // Store unit for metadata/grouping
          category_id: recipe.category_id, 
          category_name: recipe.category_name || 'Inne',
          checked: false,
          recipeSources: [recipe.title]
        };
      }
    });
  });

  // Sort for display: by category_name, then by item name
  const groupedAndSortedList = Object.values(aggregatedIngredients).sort((a, b) => {
    const catComp = (a.category_name || 'Inne').localeCompare(b.category_name || 'Inne');
    if (catComp !== 0) return catComp;
    return a.name.localeCompare(b.name);
  });
  
  return groupedAndSortedList;
};
