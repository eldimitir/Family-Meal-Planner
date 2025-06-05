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

// For Recipe export/import, ingredients are nested differently
export interface RecipeDbIngredient extends Omit<Ingredient, 'id' | 'recipe_id'> {}


export interface Recipe {
  id: string; // UUID from Supabase
  title: string;
  ingredients: Ingredient[]; // Used in UI and for form
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

// For export/import, the recipe structure might be slightly different for DB operations
export interface RecipeForExport extends Omit<Recipe, 'ingredients' | 'category_name' | 'category_code_prefix' | 'persons_names'> {
  db_ingredients: RecipeDbIngredient[]; // Store ingredients as they are in the DB (without their own ID)
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

// For export/import, exclude derived fields and 'id' for insertion
export interface PlannedMealForExport extends Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'> {}


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

// Represents a meal as stored within an archived plan (without live id, created_at, derived persons_names)
export interface ArchivedMealData extends Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'> {}

// For Archiving Meal Plans
export interface ArchivedPlan {
    id: string; // UUID from Supabase
    name: string;
    plan_data: Record<DayOfWeek, ArchivedMealData[]>; // The actual weekly plan data, using ArchivedMealData
    archived_at: string; // ISO date string from Supabase
}

// For export/import, exclude 'id' for insertion
export interface ArchivedPlanForExport extends Omit<ArchivedPlan, 'id' | 'archived_at'> {}

// For Full Data Export/Import
export interface FullExportData {
    recipeCategories: RecipeCategoryDB[];
    units: Unit[];
    persons: Person[];
    recipes: RecipeForExport[]; // Recipes with nested DB-style ingredients
    plannedMeals: PlannedMealForExport[];
    archivedPlans?: ArchivedPlanForExport[]; // Optional, if archiving is used
}