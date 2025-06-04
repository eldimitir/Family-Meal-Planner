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
  addRecipeCategory: (categoryData: Omit<RecipeCategoryDB, 'id' | 'created_at'>) => Promise<RecipeCategoryDB | null>;
  updateRecipeCategory: (categoryData: Omit<RecipeCategoryDB, 'created_at'>) => Promise<RecipeCategoryDB | null>;
  deleteRecipeCategory: (categoryId: string) => Promise<void>;

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
  getAllRecipePersons: () => string[];
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
      const category = r.category_id ? categories.find(cat => cat.id === r.category_id) : null;
      return {
        ...r,
        category_name: category?.name || null, // Keep null if no category_id or category not found
        category_code_prefix: category?.prefix || null,
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
        .order('prefix', { ascending: true }); // Order by prefix for consistent display
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

  const fetchRecipes = useCallback(async (currentCategories?: RecipeCategoryDB[]) => {
    const categoriesToUse = currentCategories || recipeCategories;
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
      setRecipes(mapRecipeData(data, categoriesToUse));
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [recipeCategories, mapRecipeData]); 

  useEffect(() => {
    if (!isLoadingCategories) { // Wait for categories to load/fail
        fetchRecipes(recipeCategories);
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
      }, {} as WeeklyPlan); 

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
      setWeeklyPlan({...initialWeeklyPlan});
    } finally {
      setIsLoadingPlanner(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchPlanner();
  }, [fetchCategories, fetchUnits, fetchPlanner]); // fetchRecipes is triggered by category load


  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      let nextInternalPrefix = 1;
      if (recipeData.category_id) { // Only generate prefix if category is assigned
        const { data: categoryRecipes, error: prefixError } = await supabase
          .from('recipes')
          .select('recipe_internal_prefix')
          .eq('category_id', recipeData.category_id)
          .order('recipe_internal_prefix', { ascending: false })
          .limit(1);

        if (prefixError) throw prefixError;
        if (categoryRecipes && categoryRecipes.length > 0) {
            nextInternalPrefix = categoryRecipes[0].recipe_internal_prefix + 1;
        }
      } else { // No category, so perhaps prefix is not applicable or default
        nextInternalPrefix = 1; // Or handle as needed, maybe based on recipes without category
        // For simplicity, let's assume recipes without category also attempt a prefix, though uq_category_recipe_prefix might disallow null category_id with non-unique prefix
        // The DB constraint `uq_category_recipe_prefix UNIQUE (category_id, recipe_internal_prefix)` means this combination must be unique.
        // If category_id is NULL, multiple recipes can have recipe_internal_prefix = 1 if (NULL, 1) is unique each time - this depends on DB's NULL handling in unique constraints.
        // Usually, NULLs are not considered equal in unique constraints, so (NULL, 1) can appear multiple times.
        // To avoid issues, ensure `recipe_internal_prefix` is globally unique if `category_id` is NULL, or assign a default "no category" prefix logic.
        // For now, let's just assign 1 if no category.
      }


      const recipeToInsert = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id || null, // Ensure null if empty
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

      let newRecipe = recipeResult as any; 

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
      
      const fullyMappedRecipe = mapRecipeData([newRecipe], recipeCategories)[0];
      setRecipes(prev => mapRecipeData([fullyMappedRecipe, ...prev.map(p => ({...p, ingredients: p.ingredients.map(i => ({...i}))}))], recipeCategories).sort((a,b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error adding recipe:", e);
      setErrorRecipes(e as Error);
      return null;
    }
  };

  const updateRecipe = async (recipeData: Omit<Recipe, 'created_at'|'ingredients' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      const originalRecipe = recipes.find(r => r.id === recipeData.id);
      if (!originalRecipe) throw new Error("Original recipe not found for update.");

      let newInternalPrefix = recipeData.recipe_internal_prefix;

      // If category_id changed, recalculate recipe_internal_prefix for the new category
      if (recipeData.category_id !== originalRecipe.category_id) {
        newInternalPrefix = 1; // Default
        if (recipeData.category_id) { // Only if new category is not null
            const { data: categoryRecipes, error: prefixError } = await supabase
            .from('recipes')
            .select('recipe_internal_prefix')
            .eq('category_id', recipeData.category_id)
            .order('recipe_internal_prefix', { ascending: false })
            .limit(1);

            if (prefixError) throw prefixError;
            if (categoryRecipes && categoryRecipes.length > 0) {
                newInternalPrefix = categoryRecipes[0].recipe_internal_prefix + 1;
            }
        } else {
            // Handle if new category_id is null (similar logic to addRecipe for null category_id)
            // For now, let's just reset to 1; uniqueness for (NULL, prefix) relies on DB behavior.
             newInternalPrefix = 1; // Or a different logic for uncategorized recipes
        }
      }


      const recipeToUpdate = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id || null,
        recipe_internal_prefix: newInternalPrefix, 
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
      
      let updatedRecipe = updatedRecipeResult as any;

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
      
      const fullyMappedRecipe = mapRecipeData([updatedRecipe], recipeCategories)[0];
      setRecipes(prev => prev.map(r => r.id === fullyMappedRecipe.id ? fullyMappedRecipe : r));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error updating recipe:", e);
      setErrorRecipes(e as Error);
      // Check for unique constraint violation for prefix
      if (e instanceof Error && e.message.includes('uq_category_recipe_prefix')) {
          alert("Błąd: Prefiks przepisu w ramach wybranej kategorii nie jest unikalny. Spróbuj ponownie lub skontaktuj się z administratorem, jeśli problem się powtarza.");
      }
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
      await fetchPlanner(); 
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

  // Recipe Category CRUD
  const addRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'id' | 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .insert(categoryData)
        .select()
        .single();
      if (error) {
        if (error.message.includes('recipe_categories_prefix_key') || error.message.includes('duplicate key value violates unique constraint "recipe_categories_prefix_key"')) {
            alert('Błąd: Prefiks kategorii musi być unikalny.');
        } else if (error.message.includes('recipe_categories_name_key')) {
            alert('Błąd: Nazwa kategorii musi być unikalna.');
        }
        throw error;
      }
      if (!data) throw new Error("Failed to add recipe category.");
      await fetchCategories(); // Refresh categories list
      return data as RecipeCategoryDB;
    } catch (e) {
      console.error("Error adding recipe category:", e);
      setErrorCategories(e as Error);
      return null;
    }
  };

  const updateRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .update({ name: categoryData.name, prefix: categoryData.prefix })
        .eq('id', categoryData.id)
        .select()
        .single();
      if (error) {
         if (error.message.includes('recipe_categories_prefix_key') || error.message.includes('duplicate key value violates unique constraint "recipe_categories_prefix_key"')) {
            alert('Błąd: Prefiks kategorii musi być unikalny.');
        } else if (error.message.includes('recipe_categories_name_key')) {
            alert('Błąd: Nazwa kategorii musi być unikalna.');
        }
        throw error;
      }
      if (!data) throw new Error("Failed to update recipe category.");
      await fetchCategories(); // Refresh categories list
      await fetchRecipes(recipeCategories); // Recipes might need remapping of category name/prefix
      return data as RecipeCategoryDB;
    } catch (e) {
      console.error("Error updating recipe category:", e);
      setErrorCategories(e as Error);
      return null;
    }
  };

  const deleteRecipeCategory = async (categoryId: string) => {
    try {
      // Before deleting category, update recipes using it to set category_id to null
      const { error: updateRecipesError } = await supabase
        .from('recipes')
        .update({ category_id: null, category_name: null, category_code_prefix: null }) // Also clear derived fields
        .eq('category_id', categoryId);

      if (updateRecipesError) throw updateRecipesError;

      const { error: deleteCategoryError } = await supabase
        .from('recipe_categories')
        .delete()
        .eq('id', categoryId);
      if (deleteCategoryError) throw deleteCategoryError;
      
      await fetchCategories(); // Refresh categories list
      await fetchRecipes(); // Refresh recipes as their category_id might have changed to null
    } catch (e) {
      console.error("Error deleting recipe category:", e);
      setErrorCategories(e as Error);
    }
  };

  // Planned Meal CRUD (updated for persons array)
  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'created_at'>): Promise<PlannedMeal | null> => {
    try {
      const { data, error } = await supabase
        .from('planned_meals')
        .insert(mealData) // mealData now contains persons: string[]
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Failed to add planned meal.");
      await fetchPlanner(); 
      return data as PlannedMeal;
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
        .update({ // Ensure all fields are correctly passed
            day: mealData.day,
            meal_type: mealData.meal_type,
            recipe_id: mealData.recipe_id,
            custom_meal_name: mealData.custom_meal_name,
            persons: mealData.persons, // Updated field
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

  // Unit CRUD
  const addUnit = async (unitName: string): Promise<Unit | null> => {
    if (!unitName.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('units')
        .insert({ name: unitName.trim() })
        .select()
        .single();
      if (error) {
         if (error.message.includes('units_name_key')) {
            alert('Błąd: Nazwa jednostki musi być unikalna.');
        }
        throw error;
      }
      if (!data) throw new Error("Failed to add unit.");
      await fetchUnits();
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
      await fetchUnits();
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

  const getAllRecipePersons = useCallback((): string[] => {
    const personsSet = new Set<string>();
    recipes.forEach(recipe => {
      if(recipe.persons) {
        recipe.persons.forEach(person => personsSet.add(person));
      }
    });
    return Array.from(personsSet).sort();
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
      addRecipeCategory,
      updateRecipeCategory,
      deleteRecipeCategory,
      addPlannedMeal,
      updatePlannedMeal,
      deletePlannedMeal,
      clearWeeklyPlan,
      addUnit,
      deleteUnit,
      refreshRecipes: () => fetchRecipes(recipeCategories),
      refreshPlanner: fetchPlanner,
      refreshCategories: fetchCategories,
      refreshUnits: fetchUnits,
      getAllIngredientNames,
      getAllRecipePersons,
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
