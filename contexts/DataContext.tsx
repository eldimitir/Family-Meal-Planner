import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek, RecipeCategoryDB, Unit } from '../types';
import { DAYS_OF_WEEK, SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL_PLACEHOLDER") {
  console.error("Supabase URL is not configured. Please set process.env.SUPABASE_URL or update constants.ts");
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY_PLACEHOLDER") {
  console.error("SupABASE ANON KEY is not configured. Please set process.env.SUPABASE_ANON_KEY or update constants.ts");
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface DataContextType {
  recipes: Recipe[];
  recipeCategories: RecipeCategoryDB[];
  units: Unit[];
  weeklyPlan: WeeklyPlan;
  isLoadingRecipes: boolean;
  isLoadingPlanner: boolean;
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  errorRecipes: Error | null;
  errorPlanner: Error | null;
  errorCategories: Error | null;
  errorUnits: Error | null;
  addRecipe: (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  updateRecipe: (recipeData: Omit<Recipe, 'created_at'| 'ingredients' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  getCategoryById: (categoryId: string) => RecipeCategoryDB | undefined;
  addPlannedMeal: (plannedMealData: Omit<PlannedMeal, 'id' | 'created_at'>) => Promise<PlannedMeal | null>;
  updatePlannedMeal: (plannedMeal: Omit<PlannedMeal, 'created_at'>) => Promise<PlannedMeal | null>;
  deletePlannedMeal: (plannedMealId: string) => Promise<void>;
  clearWeeklyPlan: () => Promise<void>;
  addUnit: (unitName: string) => Promise<Unit | null>;
  deleteUnit: (unitId: string) => Promise<void>;
  refreshRecipes: () => Promise<void>;
  refreshPlanner: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshUnits: () => Promise<void>;
  getAllIngredientNames: () => string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialWeeklyPlan: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = [];
  return acc;
}, {} as WeeklyPlan);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeCategories, setRecipeCategories] = useState<RecipeCategoryDB[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(initialWeeklyPlan);

  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState<boolean>(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true);

  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);
  const [errorCategories, setErrorCategories] = useState<Error | null>(null);
  const [errorUnits, setErrorUnits] = useState<Error | null>(null);

  const mapRecipeData = useCallback((rawRecipes: any[], categories: RecipeCategoryDB[]): Recipe[] => {
    return (rawRecipes || []).map(r => {
      const category = categories.find(cat => cat.id === r.category_id);
      return {
        ...r,
        category_name: category?.name || 'Brak kategorii',
        category_code_prefix: category?.prefix,
        // ingredients are already fetched with the recipe due to select(`*, ingredients (*)`)
      } as Recipe;
    });
  }, []);
  
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setErrorCategories(null);
    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setRecipeCategories(data || []);
    } catch (e) {
      console.error("Error fetching recipe categories:", e);
      setErrorCategories(e as Error);
      setRecipeCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setIsLoadingUnits(true);
    setErrorUnits(null);
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setUnits(data || []);
    } catch (e) {
      console.error("Error fetching units:", e);
      setErrorUnits(e as Error);
      setUnits([]);
    } finally {
      setIsLoadingUnits(false);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    // Ensure categories are loaded first or handle loading state appropriately
    if (recipeCategories.length === 0 && !isLoadingCategories && !errorCategories) {
        // If categories haven't been fetched yet, trigger it. This might cause a double fetch if not careful.
        // Better to ensure fetchCategories is called once initially.
    }

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
      // Pass current recipeCategories for mapping, even if they are still loading/empty initially.
      // The mapping will be updated when recipeCategories state changes if recipes are refetched or remapped.
      setRecipes(mapRecipeData(data, recipeCategories));
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [recipeCategories, mapRecipeData, isLoadingCategories, errorCategories]); // Added dependencies

  // Effect to refetch recipes if categories change, ensuring recipe data is correctly mapped
  useEffect(() => {
    if (!isLoadingCategories && recipeCategories.length > 0) {
        fetchRecipes();
    }
  }, [recipeCategories, isLoadingCategories, fetchRecipes]);


  const fetchPlanner = useCallback(async () => {
    setIsLoadingPlanner(true);
    setErrorPlanner(null);
    try {
      const { data, error } = await supabase
        .from('planned_meals')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const newWeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = [];
        return acc;
      }, {} as WeeklyPlan); // Initialize with empty arrays for all days

      (data || []).forEach(meal => {
        if (newWeeklyPlan[meal.day as DayOfWeek]) {
          newWeeklyPlan[meal.day as DayOfWeek].push(meal as PlannedMeal);
        } else {
          // This case should ideally not happen if newWeeklyPlan is initialized correctly
          newWeeklyPlan[meal.day as DayOfWeek] = [meal as PlannedMeal];
        }
      });
      setWeeklyPlan(newWeeklyPlan);

    } catch (e) {
      console.error("Error fetching planner data:", e);
      setErrorPlanner(e as Error);
      setWeeklyPlan({...initialWeeklyPlan});
    } finally {
      setIsLoadingPlanner(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    // fetchRecipes will be called by the useEffect that depends on recipeCategories
    fetchPlanner();
  }, [fetchCategories, fetchUnits, fetchPlanner]);


  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      // Client-side prefix generation (vulnerable to race conditions)
      const { data: categoryRecipes, error: prefixError } = await supabase
        .from('recipes')
        .select('recipe_internal_prefix')
        .eq('category_id', recipeData.category_id)
        .order('recipe_internal_prefix', { ascending: false })
        .limit(1);

      if (prefixError) throw prefixError;
      const nextInternalPrefix = categoryRecipes && categoryRecipes.length > 0 ? categoryRecipes[0].recipe_internal_prefix + 1 : 1;

      const recipeToInsert = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id,
        recipe_internal_prefix: nextInternalPrefix,
        tags: recipeData.tags,
        persons: recipeData.persons,
        calories: recipeData.calories,
      };

      const { data: recipeResult, error: recipeError } = await supabase
        .from('recipes')
        .insert(recipeToInsert)
        .select()
        .single();

      if (recipeError) throw recipeError;
      if (!recipeResult) throw new Error("Recipe creation failed.");

      let newRecipe = recipeResult as Recipe; // Type assertion
      const category = recipeCategories.find(cat => cat.id === newRecipe.category_id);
      newRecipe.category_name = category?.name;
      newRecipe.category_code_prefix = category?.prefix;


      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({
          ...ing,
          recipe_id: newRecipe.id,
        }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();
        if (ingredientsError) throw ingredientsError;
        newRecipe.ingredients = insertedIngredients || [];
      } else {
         newRecipe.ingredients = [];
      }
      
      // Instead of mapRecipeData, manually construct the full object or refetch
      setRecipes(prev => mapRecipeData([newRecipe, ...prev.map(p => ({...p, ingredients: p.ingredients.map(i => ({...i}))}))], recipeCategories)); //Ensure deep copy if needed
      return newRecipe;
    } catch (e) {
      console.error("Error adding recipe:", e);
      setErrorRecipes(e as Error);
      return null;
    }
  };

  const updateRecipe = async (recipeData: Omit<Recipe, 'created_at'|'ingredients' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      const recipeToUpdate = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id,
        recipe_internal_prefix: recipeData.recipe_internal_prefix, // Prefix should not change on update
        tags: recipeData.tags,
        persons: recipeData.persons,
        calories: recipeData.calories,
      };

      const { data: updatedRecipeResult, error: recipeError } = await supabase
        .from('recipes')
        .update(recipeToUpdate)
        .eq('id', recipeData.id)
        .select()
        .single();

      if (recipeError) throw recipeError;
      if (!updatedRecipeResult) throw new Error("Recipe update failed.");
      
      let updatedRecipe = updatedRecipeResult as Recipe;
      const category = recipeCategories.find(cat => cat.id === updatedRecipe.category_id);
      updatedRecipe.category_name = category?.name;
      updatedRecipe.category_code_prefix = category?.prefix;

      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', recipeData.id);
      if (deleteError) throw deleteError;

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
      setErrorRecipes(e as Error);
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);
      if (error) throw error;
      
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      await fetchPlanner(); // Refresh planner as recipe_id might have been nulled
    } catch (e) {
      console.error("Error deleting recipe:", e);
      setErrorRecipes(e as Error);
    }
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };

  const getCategoryById = (categoryId: string): RecipeCategoryDB | undefined => {
    return recipeCategories.find(cat => cat.id === categoryId);
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
      await fetchPlanner(); // Refresh for simplicity and to ensure order
      return newMeal;
    } catch (e) {
      console.error("Error adding planned meal:", e);
      setErrorPlanner(e as Error);
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
            person: mealData.person,
        })
        .eq('id', mealData.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to update planned meal.");
      await fetchPlanner();
      return data as PlannedMeal;
    } catch (e) {
      console.error("Error updating planned meal:", e);
      setErrorPlanner(e as Error);
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
      await fetchPlanner();
    } catch (e) {
      console.error("Error deleting planned meal:", e);
      setErrorPlanner(e as Error);
    }
  };

  const clearWeeklyPlan = async () => {
    try {
      const { error } = await supabase
        .from('planned_meals')
        .delete()
        .neq('id', crypto.randomUUID()); 
        
      if (error) throw error;
      setWeeklyPlan({ ...initialWeeklyPlan });
    } catch (e) {
      console.error("Error clearing weekly plan:", e);
      setErrorPlanner(e as Error);
    }
  };

  const addUnit = async (unitName: string): Promise<Unit | null> => {
    if (!unitName.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('units')
        .insert({ name: unitName.trim() })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Failed to add unit.");
      setUnits(prev => [...prev, data as Unit].sort((a,b) => a.name.localeCompare(b.name)));
      return data as Unit;
    } catch (e) {
      console.error("Error adding unit:", e);
      setErrorUnits(e as Error);
      return null;
    }
  };

  const deleteUnit = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);
      if (error) throw error;
      setUnits(prev => prev.filter(u => u.id !== unitId));
    } catch (e) {
      console.error("Error deleting unit:", e);
      setErrorUnits(e as Error);
    }
  };
  
  const getAllIngredientNames = useCallback((): string[] => {
    const names = new Set<string>();
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => names.add(ing.name));
    });
    return Array.from(names).sort();
  }, [recipes]);


  return (
    <DataContext.Provider value={{
      recipes,
      recipeCategories,
      units,
      weeklyPlan,
      isLoadingRecipes,
      isLoadingPlanner,
      isLoadingCategories,
      isLoadingUnits,
      errorRecipes,
      errorPlanner,
      errorCategories,
      errorUnits,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      getRecipeById,
      getCategoryById,
      addPlannedMeal,
      updatePlannedMeal,
      deletePlannedMeal,
      clearWeeklyPlan,
      addUnit,
      deleteUnit,
      refreshRecipes: fetchRecipes,
      refreshPlanner: fetchPlanner,
      refreshCategories: fetchCategories,
      refreshUnits: fetchUnits,
      getAllIngredientNames,
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
