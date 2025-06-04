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
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://wcwvulpiozkdtqnxhycv.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjd3Z1bHBpb3prZHRxbnhoeWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzI3NDUsImV4cCI6MjA2NDIwODc0NX0.dWVrM014v00CLFViq6NVTg_swpj5r8CT9aMuenSRNDw";


export const LOCAL_STORAGE_KEYS = {
  AUTH: 'familyMealPlannerAuth',
  // Add other keys as needed, e.g., for user preferences if they were stored locally
};

export const formatPrefix = (num: number | undefined, length: number = 3): string => {
  if (typeof num === 'undefined' || num === null) return ''.padStart(length, '0');
  return num.toString().padStart(length, '0');
};
