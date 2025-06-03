export interface Ingredient {
  id: string; // Will be UUID from Supabase
  recipe_id?: string; // Foreign key to Recipe, added for clarity when handling ingredients separately
  name: string;
  quantity: string;
  unit: string;
}

export enum RecipeCategory {
  SNIADANIE = "Śniadanie",
  OBIAD = "Obiad",
  KOLACJA = "Kolacja",
  DESER = "Deser",
  PRZEKASKA = "Przekąska",
  NAPOJ = "Napój",
  INNE = "Inne",
}

export interface Recipe {
  id: string; // UUID from Supabase
  title: string;
  ingredients: Ingredient[]; // Will be populated by joining/fetching related ingredients
  instructions: string;
  prep_time: string; // Consider if this should be more structured, e.g., number in minutes
  category: RecipeCategory;
  tags: string[]; // Stored as text[] in Supabase
  created_at?: string; // ISO date string from Supabase
}

// Represents the structure of a recipe as suggested by the AI
// before it's processed and saved into the main Recipe list.
export interface AISuggestedRecipe {
  title: string;
  ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[];
  instructions: string; // Can be a single string with newlines, or an array of strings.
  prep_time: string;
  category: RecipeCategory;
  tags: string[];
}


export interface PlannedMeal {
  id: string; // UUID from Supabase
  day: string;
  meal_type: string;
  recipe_id: string | null; // Foreign key to Recipe
  custom_meal_name?: string;
  servings: number;
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
  category?: RecipeCategory | string;
  checked: boolean;
  recipeSources: string[];
}

export type DayOfWeek = "Poniedziałek" | "Wtorek" | "Środa" | "Czwartek" | "Piątek" | "Sobota" | "Niedziela";