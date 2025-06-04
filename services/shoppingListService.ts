import { WeeklyPlan, Recipe, Ingredient, ShoppingListItem } from '../types'; 

// Improved parseQuantity to extract numbers from strings like "1 cup", "2-3 pieces", "approx 100g"
const parseQuantity = (quantityStr: string | undefined | null): number => {
  if (typeof quantityStr !== 'string' || !quantityStr.trim()) return NaN;
  
  // Attempt to handle simple fractions like "1/2", "3/4"
  const fractionMatch = quantityStr.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    if (den !== 0) return num / den;
  }

  // Attempt to handle ranges like "2-3" by taking the average or first number
  const rangeMatch = quantityStr.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
    // Or simply: return parseInt(rangeMatch[1], 10); 
  }
  
  // General number extraction, allowing for decimals
  const numericPartMatch = quantityStr.match(/([0-9]*[.,])?[0-9]+/);
  if (numericPartMatch) {
    const numStr = numericPartMatch[0].replace(',', '.');
    const num = parseFloat(numStr);
    return isNaN(num) ? NaN : num;
  }
  
  return NaN; 
};


export const generateShoppingList = (weeklyPlan: WeeklyPlan, recipes: Recipe[]): ShoppingListItem[] => {
  const aggregatedIngredients: { [key: string]: ShoppingListItem } = {};

  Object.values(weeklyPlan).flat().forEach(plannedMeal => {
    if (!plannedMeal.recipe_id) return;

    const recipe = recipes.find(r => r.id === plannedMeal.recipe_id);
    if (!recipe) return;

    const servingsMultiplier = 1; // Assuming recipe ingredients are for the whole dish.

    recipe.ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;
      
      const currentIngredientQuantityStr = ingredient.quantity; 
      const currentIngredientUnit = ingredient.unit;
      const currentNumericValue = parseQuantity(currentIngredientQuantityStr);

      if (aggregatedIngredients[key]) {
        const existingItem = aggregatedIngredients[key];
        const existingNumericSum = parseQuantity(existingItem.quantity.split(';')[0]); // Try to parse the primary numeric part

        if (!isNaN(existingNumericSum) && !isNaN(currentNumericValue)) {
          // Both existing sum and current new value are numeric, sum them
          const newSum = existingNumericSum + (currentNumericValue * servingsMultiplier);
          existingItem.quantity = `${newSum} ${currentIngredientUnit}`; // Re-form the primary quantity string
                                                                      // Preserve any previously appended non-numeric parts if necessary, or decide to overwrite
        } else {
          // One or both are not numeric, or current numeric sum is NaN. Append current ingredient's original string.
          // This ensures non-numeric quantities or unparsable ones are still listed.
          let newQuantityString = existingItem.quantity;
          if (!newQuantityString.toLowerCase().includes(currentIngredientQuantityStr.toLowerCase())) { // Avoid duplicate appends
             newQuantityString += `; ${currentIngredientQuantityStr}`;
             // If unit is distinct and not in the appended string, add it
             if (currentIngredientUnit && !currentIngredientQuantityStr.toLowerCase().includes(currentIngredientUnit.toLowerCase())) {
                 newQuantityString += ` ${currentIngredientUnit}`;
             }
          }
          existingItem.quantity = newQuantityString;
        }
        if (!existingItem.recipeSources.includes(recipe.title)) {
            existingItem.recipeSources.push(recipe.title);
        }
      } else { 
        // New item for the list
        let initialFullQuantityString;
        if (!isNaN(currentNumericValue)) { 
          initialFullQuantityString = `${currentNumericValue * servingsMultiplier} ${currentIngredientUnit}`;
        } else { 
          initialFullQuantityString = currentIngredientQuantityStr;
          if (currentIngredientUnit && !initialFullQuantityString.toLowerCase().includes(currentIngredientUnit.toLowerCase())) {
            initialFullQuantityString = `${initialFullQuantityString} ${currentIngredientUnit}`;
          }
        }
        
        aggregatedIngredients[key] = {
          id: crypto.randomUUID(),
          name: ingredient.name,
          quantity: initialFullQuantityString.trim(), 
          unit: currentIngredientUnit, 
          category_id: recipe.category_id, 
          category_name: recipe.category_name || 'Inne',
          checked: false,
          recipeSources: [recipe.title]
        };
      }
    });
  });

  // Clean up quantity strings that might have "NaN units" or redundant semicolons
  Object.values(aggregatedIngredients).forEach(item => {
    item.quantity = item.quantity.replace(/^NaN\s+\w+;\s*/, ''); // Remove leading "NaN unit; "
    item.quantity = item.quantity.replace(/; NaN\s+\w+/, ''); // Remove trailing "; NaN unit"
    item.quantity = item.quantity.replace(/^null\s+\w+;\s*/, '');
    item.quantity = item.quantity.replace(/; null\s+\w+/, '');
    item.quantity = item.quantity.replace(/^undefined\s+\w+;\s*/, '');
    item.quantity = item.quantity.replace(/; undefined\s+\w+/, '');


    // If quantity became just the unit due to parsing, show original if possible (this part is tricky)
    // For now, just ensure it's not "NaN unit"
     if (item.quantity.startsWith("NaN ") || item.quantity.startsWith("null ") || item.quantity.startsWith("undefined ")) {
        // This indicates a parsing failure on the initial add.
        // It's hard to recover the original string here without storing it separately.
        // The parseQuantity should be robust enough.
        // Fallback: if quantity is 'NaN unit' or similar, try to find an original ingredient string if possible
        // This path is complex and suggests parseQuantity or initial setup needs to be very robust.
        // For now, we accept that some non-standard quantities might look odd if parseQuantity fails initially.
    }
  });


  const groupedAndSortedList = Object.values(aggregatedIngredients).sort((a, b) => {
    const catComp = (a.category_name || 'Inne').localeCompare(b.category_name || 'Inne');
    if (catComp !== 0) return catComp;
    return a.name.localeCompare(b.name);
  });
  
  return groupedAndSortedList;
};