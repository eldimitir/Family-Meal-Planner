
export interface Ingredient {
  id: string;
  name: string;
  quantity: string; // Keep as string to allow "szczypta", "do smaku" etc.
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
  id: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string; // Step-by-step, could be markdown
  prepTime: string; // e.g., "30 minut"
  category: RecipeCategory;
  tags: string[]; // e.g., ["wegetariańskie", "szybkie"]
  createdAt: string; // ISO date string
}

export interface PlannedMeal {
  id: string;
  day: string; // e.g., "Poniedziałek"
  mealType: string; // e.g., "Śniadanie", "Obiad", "Kolacja"
  recipeId: string | null; // ID of the recipe, or null if custom meal
  customMealName?: string; // If no recipe is selected
  servings: number; // 1 or 2 people
}

export interface WeeklyPlan {
  [day: string]: PlannedMeal[]; // Key is day name e.g. "Poniedziałek"
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string; // Aggregated quantity
  unit: string;
  category?: RecipeCategory | string; // Optional: for grouping
  checked: boolean;
  recipeSources: string[]; // Titles of recipes this ingredient is for
}

export type DayOfWeek = "Poniedziałek" | "Wtorek" | "Środa" | "Czwartek" | "Piątek" | "Sobota" | "Niedziela";

    