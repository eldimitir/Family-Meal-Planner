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

export interface Person {
  id: string; // UUID from Supabase
  name: string;
  created_at?: string; // ISO date string from Supabase
}

export interface Ingredient {
  id: string; // Will be UUID from Supabase
  recipe_id?: string; // Foreign key to Recipe
  name: string;
  quantity: string;
  unit: string; // Will now be text, suggested from Units table
}

export interface Recipe {
  id: string; // UUID from Supabase
  title: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: string;
  category_id: string | null; // Foreign key to RecipeCategoryDB, can be null if category deleted
  category_name?: string | null; // Populated after fetching/joining
  category_code_prefix?: number | null; // Populated from RecipeCategoryDB.prefix after fetching/joining
  recipe_internal_prefix: number; // Auto-incremented within category
  tags: string[];
  person_ids: string[] | null; // Stored IDs of persons
  persons_names?: string[] | null; // Populated (derived) names of persons
  calories: number | null; 
  created_at?: string; // ISO date string from Supabase
}

export interface PlannedMeal {
  id: string; // UUID from Supabase
  day: string;
  meal_type: string;
  recipe_id: string | null; // Foreign key to Recipe
  custom_meal_name?: string;
  person_ids: string[] | null; // Selected person IDs for this specific meal instance
  persons_names?: string[] | null; // Populated (derived) names of persons for this meal
  created_at?: string; // ISO date string from Supabase
}

export interface WeeklyPlan {
  [day: string]: PlannedMeal[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string; // This string should be self-contained, e.g., "100 g", "1 sztuka"
  unit: string; // For metadata, filtering, or if quantity is just a number string
  category_id?: string | null; 
  category_name?: string; 
  checked: boolean;
  recipeSources: string[];
}

export type DayOfWeek = "Poniedziałek" | "Wtorek" | "Środa" | "Czwartek" | "Piątek" | "Sobota" | "Niedziela";

// For calorie summary table (per person)
export interface PersonDailyCalorieSummary {
  [day: string]: number; // Calories for DayOfWeek
  total: number; // Total for the person for the week
}
export interface WeeklyCalorieTableSummary {
  persons: {
    [personName: string]: PersonDailyCalorieSummary;
  };
  dailyTotals: {
    [day: string]: number; // Total for DayOfWeek across all persons
  };
  grandTotal: number;
}

// For calorie summary table (per meal type)
export interface MealTypeDailyCalorieSummary {
  [day: string]: number; // Calories for DayOfWeek for this meal type
  total: number; // Total for the meal type for the week
}

export interface WeeklyMealTypeCalorieSummary {
  mealTypes: {
    [mealType: string]: MealTypeDailyCalorieSummary;
  };
  dailyTotals: { // Total for DayOfWeek across all meal types
    [day: string]: number;
  };
  grandTotal: number; // Grand total for the week across all meal types
}