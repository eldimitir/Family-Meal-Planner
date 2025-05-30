import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek } from '../types';
import { DAYS_OF_WEEK, SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Ensure environment variables are non-empty or provide clear instructions.
if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL_PLACEHOLDER") {
  console.error("Supabase URL is not configured. Please set process.env.SUPABASE_URL or update constants.ts");
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY_PLACEHOLDER") {
  console.error("SupABASE ANON KEY is not configured. Please set process.env.SUPABASE_ANON_KEY or update constants.ts");
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface DataContextType {
  recipes: Recipe[];
  weeklyPlan: WeeklyPlan;
  isLoadingRecipes: boolean;
  isLoadingPlanner: boolean;
  errorRecipes: Error | null;
  errorPlanner: Error | null;
  addRecipe: (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  updateRecipe: (recipeData: Omit<Recipe, 'created_at'| 'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  addPlannedMeal: (plannedMealData: Omit<PlannedMeal, 'id' | 'created_at'>) => Promise<PlannedMeal | null>;
  updatePlannedMeal: (plannedMeal: Omit<PlannedMeal, 'created_at'>) => Promise<PlannedMeal | null>;
  deletePlannedMeal: (plannedMealId: string) => Promise<void>;
  clearWeeklyPlan: () => Promise<void>;
  refreshRecipes: () => Promise<void>;
  refreshPlanner: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialWeeklyPlan: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = [];
  return acc;
}, {} as WeeklyPlan);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(initialWeeklyPlan);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState<boolean>(true);
  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);

  const fetchRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    setErrorRecipes(null);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data as Recipe[] || []);
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]); // Reset on error
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  const fetchPlanner = useCallback(async () => {
    setIsLoadingPlanner(true);
    setErrorPlanner(null);
    try {
      const { data, error } = await supabase
        .from('planned_meals')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const newWeeklyPlan = { ...initialWeeklyPlan };
      (data || []).forEach(meal => {
        if (newWeeklyPlan[meal.day as DayOfWeek]) {
          newWeeklyPlan[meal.day as DayOfWeek].push(meal as PlannedMeal);
        } else {
          newWeeklyPlan[meal.day as DayOfWeek] = [meal as PlannedMeal];
        }
      });
      setWeeklyPlan(newWeeklyPlan);

    } catch (e) {
      console.error("Error fetching planner data:", e);
      setErrorPlanner(e as Error);
      setWeeklyPlan({...initialWeeklyPlan}); // Reset on error
    } finally {
      setIsLoadingPlanner(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
    fetchPlanner();
  }, [fetchRecipes, fetchPlanner]);

  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      // Insert recipe
      const { data: recipeResult, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: recipeData.title,
          instructions: recipeData.instructions,
          prep_time: recipeData.prep_time,
          category: recipeData.category,
          tags: recipeData.tags,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;
      if (!recipeResult) throw new Error("Recipe creation failed.");

      const newRecipe = recipeResult as Recipe;

      // Insert ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({
          ...ing,
          recipe_id: newRecipe.id,
        }));
        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert);
        if (ingredientsError) throw ingredientsError;
        // Fetch the newly added ingredients to populate the recipe object correctly
         const { data: insertedIngredients, error: fetchIngredientsError } = await supabase
          .from('ingredients')
          .select('*')
          .eq('recipe_id', newRecipe.id);
        if (fetchIngredientsError) throw fetchIngredientsError;
        newRecipe.ingredients = insertedIngredients || [];
      } else {
         newRecipe.ingredients = [];
      }
      
      setRecipes(prev => [newRecipe, ...prev]);
      return newRecipe;
    } catch (e) {
      console.error("Error adding recipe:", e);
      // setErrorRecipes(e as Error); // Or a more specific error state for mutations
      return null;
    }
  };

  const updateRecipe = async (recipeData: Omit<Recipe, 'created_at'|'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      // Update recipe details
      const { data: updatedRecipeResult, error: recipeError } = await supabase
        .from('recipes')
        .update({
          title: recipeData.title,
          instructions: recipeData.instructions,
          prep_time: recipeData.prep_time,
          category: recipeData.category,
          tags: recipeData.tags,
        })
        .eq('id', recipeData.id)
        .select()
        .single();

      if (recipeError) throw recipeError;
      if (!updatedRecipeResult) throw new Error("Recipe update failed.");
      
      const updatedRecipe = updatedRecipeResult as Recipe;

      // Delete old ingredients
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', recipeData.id);
      if (deleteError) throw deleteError;

      // Insert new ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({
          ...ing,
          recipe_id: recipeData.id,
        }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();

        if (ingredientsError) throw ingredientsError;
        updatedRecipe.ingredients = insertedIngredients || [];
      } else {
        updatedRecipe.ingredients = [];
      }
      
      setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      return updatedRecipe;
    } catch (e) {
      console.error("Error updating recipe:", e);
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      // ingredients are cascade deleted by DB foreign key constraint
      // planned_meals recipe_id is set to NULL by DB foreign key constraint
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);
      if (error) throw error;
      
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      // Refresh planner as recipe_id might have been nulled
      await fetchPlanner();
    } catch (e) {
      console.error("Error deleting recipe:", e);
    }
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };

  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'created_at'>): Promise<PlannedMeal | null> => {
    try {
      const { data, error } = await supabase
        .from('planned_meals')
        .insert(mealData)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Failed to add planned meal.");

      const newMeal = data as PlannedMeal;
      setWeeklyPlan(prev => ({
        ...prev,
        [newMeal.day]: [...(prev[newMeal.day as DayOfWeek] || []), newMeal],
      }));
      return newMeal;
    } catch (e) {
      console.error("Error adding planned meal:", e);
      return null;
    }
  };

  const updatePlannedMeal = async (mealData: Omit<PlannedMeal, 'created_at'>): Promise<PlannedMeal | null> => {
     try {
      const { data, error } = await supabase
        .from('planned_meals')
        .update({
            day: mealData.day,
            meal_type: mealData.meal_type,
            recipe_id: mealData.recipe_id,
            custom_meal_name: mealData.custom_meal_name,
            servings: mealData.servings
        })
        .eq('id', mealData.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to update planned meal.");

      const updatedMeal = data as PlannedMeal;
      // This needs a more robust update, especially if day changes. For now, simple update.
      // A full refresh might be easier if day changes: await fetchPlanner();
      await fetchPlanner(); // Refresh the whole planner for simplicity after an update.
      return updatedMeal;
    } catch (e) {
      console.error("Error updating planned meal:", e);
      return null;
    }
  };

  const deletePlannedMeal = async (plannedMealId: string) => {
    try {
      const { error } = await supabase
        .from('planned_meals')
        .delete()
        .eq('id', plannedMealId);
      if (error) throw error;
      await fetchPlanner(); // Refresh the planner
    } catch (e) {
      console.error("Error deleting planned meal:", e);
    }
  };

  const clearWeeklyPlan = async () => {
    try {
      // This deletes ALL planned meals. If users were involved, you'd scope this.
      const { error } = await supabase
        .from('planned_meals')
        .delete()
        .neq('id', crypto.randomUUID()); // Supabase requires a filter for delete, this is a workaround for "delete all"
        
      if (error) throw error;
      setWeeklyPlan({ ...initialWeeklyPlan });
    } catch (e) {
      console.error("Error clearing weekly plan:", e);
    }
  };

  return (
    <DataContext.Provider value={{
      recipes,
      weeklyPlan,
      isLoadingRecipes,
      isLoadingPlanner,
      errorRecipes,
      errorPlanner,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      getRecipeById,
      addPlannedMeal,
      updatePlannedMeal,
      deletePlannedMeal,
      clearWeeklyPlan,
      refreshRecipes: fetchRecipes,
      refreshPlanner: fetchPlanner,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
