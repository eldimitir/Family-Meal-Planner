import { DayOfWeek, RecipeCategory } from './types';

export const APP_PASSWORD = "admin"; // Default password for the application

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

export const MEAL_TYPES: string[] = ["Śniadanie", "Drugie Śniadanie", "Obiad", "Podwieczorek", "Kolacja"];

export const RECIPE_CATEGORIES_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: RecipeCategory.SNIADANIE, label: "Śniadanie" },
  { value: RecipeCategory.OBIAD, label: "Obiad" },
  { value: RecipeCategory.KOLACJA, label: "Kolacja" },
  { value: RecipeCategory.DESER, label: "Deser" },
  { value: RecipeCategory.PRZEKASKA, label: "Przekąska" },
  { value: RecipeCategory.NAPOJ, label: "Napój" },
  { value: RecipeCategory.INNE, label: "Inne" },
];

// Google Sheets Configuration
// IMPORTANT: Replace 'YOUR_SPREADSHEET_ID' with your actual Google Spreadsheet ID.
// The API_KEY is expected to be available via process.env.API_KEY.
export const GOOGLE_SHEETS_CONFIG = {
  SPREADSHEET_ID: '1dV_iDGfFmeN9y40cup_lgB7eG3uhBXrCZwCpEsv7Mz0', // <--- REPLACE THIS
  RECIPES_SHEET_NAME: 'Recipes',
  WEEKLY_PLAN_SHEET_NAME: 'WeeklyPlan',
  // Define ranges - assuming first row is headers, data starts from row 2.
  // Recipes: A:id, B:title, C:ingredients (JSON), D:instructions, E:prepTime, F:category, G:tags (JSON), H:createdAt
  RECIPES_DATA_RANGE: 'Recipes!A2:H', 
  // WeeklyPlan: A:id, B:day, C:mealType, D:recipeId, E:customMealName, F:servings
  WEEKLY_PLAN_DATA_RANGE: 'WeeklyPlan!A2:F',
};

// Column definitions (1-based index for easier mapping if needed, or 0-based for array access)
// For Recipes sheet:
// Col A: id, Col B: title, Col C: ingredients (JSON), Col D: instructions, 
// Col E: prepTime, Col F: category, Col G: tags (JSON), Col H: createdAt
export const RECIPE_COLUMNS = {
  ID: 0,
  TITLE: 1,
  INGREDIENTS: 2,
  INSTRUCTIONS: 3,
  PREP_TIME: 4,
  CATEGORY: 5,
  TAGS: 6,
  CREATED_AT: 7
};
// For WeeklyPlan sheet:
// Col A: id, Col B: day, Col C: mealType, Col D: recipeId, Col E: customMealName, Col F: servings
export const WEEKLY_PLAN_COLUMNS = {
  ID: 0,
  DAY: 1,
  MEAL_TYPE: 2,
  RECIPE_ID: 3,
  CUSTOM_MEAL_NAME: 4,
  SERVINGS: 5
};


export const LOCAL_STORAGE_KEYS = { // Auth key remains for app's own password protection
  AUTH: 'familyMealPlannerAuth',
};
