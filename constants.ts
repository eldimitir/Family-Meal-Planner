
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
  RECIPES: 'familyMealPlannerRecipes',
  WEEKLY_PLAN: 'familyMealPlannerWeeklyPlan',
};
    