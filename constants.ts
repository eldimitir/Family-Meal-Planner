import { DayOfWeek } from './types';

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

// RECIPE_CATEGORIES_OPTIONS is removed as categories will be fetched from the database.
// export const RECIPE_CATEGORIES_OPTIONS: { value: RecipeCategory; label: string }[] = [
//   { value: RecipeCategory.SNIADANIE, label: "Śniadanie" },
//   { value: RecipeCategory.OBIAD, label: "Obiad" },
//   { value: RecipeCategory.KOLACJA, label: "Kolacja" },
//   { value: RecipeCategory.DESER, label: "Deser" },
//   { value: RecipeCategory.PRZEKASKA, label: "Przekąska" },
//   { value: RecipeCategory.NAPOJ, label: "Napój" },
//   { value: RecipeCategory.INNE, label: "Inne" },
// ];

// These are placeholders. In a real build environment, you'd use process.env.
// For client-side only, you might need to replace these directly or use a config file.
export const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL_PLACEHOLDER";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_PLACEHOLDER";

export const LOCAL_STORAGE_KEYS = {
  AUTH: 'familyMealPlannerAuth',
  // Add other keys as needed, e.g., for user preferences if they were stored locally
};

export const formatPrefix = (num: number | undefined, length: number = 3): string => {
  if (typeof num === 'undefined' || num === null) return ''.padStart(length, '0');
  return num.toString().padStart(length, '0');
};
