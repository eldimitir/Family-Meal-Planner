export interface Unit {
  id: string; // UUID from Supabase
  name: string;
  created_at?: string; // ISO date string from Supabase
}

export interface RecipeCategoryDB {
  id: string; // UUID from Supabase
  name: string;
  prefix: number; // Numerical prefix for the category
  created_at?: string; // ISO date string from Supabase
}

export interface Ingredient {
  id: string; // Will be UUID from Supabase
  recipe_id?: string; // Foreign key to Recipe
  name: string;
  quantity: string;
  unit: string; // Will now be text, suggested from Units table
}

// Old RecipeCategory enum is removed. Category is now linked via category_id.
// export enum RecipeCategory {
//   SNIADANIE = "Śniadanie",
//   OBIAD = "Obiad",
//   KOLACJA = "Kolacja",
//   DESER = "Deser",
//   PRZEKASKA = "Przekąska",
//   NAPOJ = "Napój",
//   INNE = "Inne",
// }

export interface Recipe {
  id: string; // UUID from Supabase
  title: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: string;
  category_id: string; // Foreign key to RecipeCategoryDB
  category_name?: string; // Populated after fetching/joining
  category_code_prefix?: number; // Populated from RecipeCategoryDB.prefix after fetching/joining
  recipe_internal_prefix: number; // Auto-incremented within category
  tags: string[];
  persons: string[]; // New field for people
  calories: number | null; // New field for calories
  created_at?: string; // ISO date string from Supabase
}

export interface PlannedMeal {
  id: string; // UUID from Supabase
  day: string;
  meal_type: string;
  recipe_id: string | null; // Foreign key to Recipe
  custom_meal_name?: string;
  person: string | null; // New: Selected person for the meal from recipe.persons
  // servings: number; // Removed
  created_at?: string; // ISO date string from Supabase
}

export interface WeeklyPlan {
  [day: string]: PlannedMeal[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category_id?: string | null; // Store category_id from recipe
  category_name?: string; // For display grouping
  checked: boolean;
  recipeSources: string[];
}

export type DayOfWeek = "Poniedziałek" | "Wtorek" | "Środa" | "Czwartek" | "Piątek" | "Sobota" | "Niedziela";
