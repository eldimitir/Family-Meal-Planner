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

export const LOCAL_STORAGE_KEYS = {
  AUTH: 'familyMealPlannerAuth',
};

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

// NocoDB Configuration
export const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL || 'https://app.nocodb.com/';
export const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN || '8fF68FTCqkww_1KO1fLvtJAo8AfnBEWJ5H-Ob8I4';
export const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID || 'ph2arub6g8qagko';

// NocoDB Table Names (adjust to your NocoDB project)
export const NOCODB_RECIPES_TABLE = 'Recipes';
export const NOCODB_INGREDIENTS_TABLE = 'Ingredients';
export const NOCODB_PLANNED_MEALS_TABLE = 'PlannedMeals';
