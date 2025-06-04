
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek, RecipeCategoryDB, Unit, ExportData } from '../types';
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
  
  refreshAllData: () => Promise<void>;
  refreshRecipes: () => Promise<void>;
  refreshPlanner: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshUnits: () => Promise<void>;
  getAllIngredientNames: () => string[];
  getAllRecipePersons: () => string[];

  exportAllData: () => Promise<ExportData | null>;
  importAllData: (data: ExportData) => Promise<boolean>;
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
        category_name: category?.name || null, 
        category_code_prefix: category?.prefix || null,
      } as Recipe;
    });
  }, []);
  
  const fetchCategories = useCallback(async (): Promise<RecipeCategoryDB[]> => {
    setIsLoadingCategories(true);
    setErrorCategories(null);
    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .select('*')
        .order('prefix', { ascending: true }); 
      if (error) throw error;
      setRecipeCategories(data || []);
      return data || [];
    } catch (e) {
      console.error("Error fetching recipe categories:", e);
      setErrorCategories(e as Error);
      setRecipeCategories([]);
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const fetchUnits = useCallback(async (): Promise<Unit[]> => {
    setIsLoadingUnits(true);
    setErrorUnits(null);
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setUnits(data || []);
      return data || [];
    } catch (e) {
      console.error("Error fetching units:", e);
      setErrorUnits(e as Error);
      setUnits([]);
      return [];
    } finally {
      setIsLoadingUnits(false);
    }
  }, []);

  const fetchRecipes = useCallback(async (currentCategories?: RecipeCategoryDB[]): Promise<Recipe[]> => {
    const categoriesToUse = currentCategories || recipeCategories; // Use latest if available
    if (isLoadingCategories && !currentCategories) { // Don't fetch if categories are loading and not passed
        // console.log("Skipping recipe fetch, categories are loading or not provided yet.");
        return [];
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
      const mappedData = mapRecipeData(data, categoriesToUse);
      setRecipes(mappedData);
      return mappedData;
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]);
      return [];
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [recipeCategories, mapRecipeData, isLoadingCategories]); 

  const fetchPlanner = useCallback(async (): Promise<WeeklyPlan> => {
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
      return newWeeklyPlan;

    } catch (e) {
      console.error("Error fetching planner data:", e);
      setErrorPlanner(e as Error);
      setWeeklyPlan({...initialWeeklyPlan});
      return {...initialWeeklyPlan};
    } finally {
      setIsLoadingPlanner(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    const cats = await fetchCategories();
    await fetchUnits();
    await fetchRecipes(cats); // Pass fetched categories directly
    await fetchPlanner();
  }, [fetchCategories, fetchUnits, fetchRecipes, fetchPlanner]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);


  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    try {
      let nextInternalPrefix = 1;
      if (recipeData.category_id) { 
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
      } else { 
        const { data: uncategorizedRecipes, error: prefixError } = await supabase
          .from('recipes')
          .select('recipe_internal_prefix')
          .is('category_id', null)
          .order('recipe_internal_prefix', { ascending: false })
          .limit(1);
        if (prefixError) throw prefixError;
        if (uncategorizedRecipes && uncategorizedRecipes.length > 0) {
            nextInternalPrefix = uncategorizedRecipes[0].recipe_internal_prefix + 1;
        }
      }


      const recipeToInsert = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id || null, 
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

      if (recipeData.category_id !== originalRecipe.category_id) {
        newInternalPrefix = 1; 
        if (recipeData.category_id) { 
            const { data: categoryRecipes, error: prefixError } = await supabase
            .from('recipes')
            .select('recipe_internal_prefix')
            .eq('category_id', recipeData.category_id)
            .neq('id', recipeData.id) // Exclude current recipe if it was already in this category
            .order('recipe_internal_prefix', { ascending: false })
            .limit(1);

            if (prefixError) throw prefixError;
            if (categoryRecipes && categoryRecipes.length > 0) {
                newInternalPrefix = categoryRecipes[0].recipe_internal_prefix + 1;
            }
        } else {
            const { data: uncategorizedRecipes, error: prefixError } = await supabase
            .from('recipes')
            .select('recipe_internal_prefix')
            .is('category_id', null)
            .neq('id', recipeData.id) // Exclude current recipe
            .order('recipe_internal_prefix', { ascending: false })
            .limit(1);
            if (prefixError) throw prefixError;
            if (uncategorizedRecipes && uncategorizedRecipes.length > 0) {
                newInternalPrefix = uncategorizedRecipes[0].recipe_internal_prefix + 1;
            }
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
          // id: crypto.randomUUID(), // Let Supabase generate new UUIDs for ingredients
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
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
      if (e instanceof Error && (e.message.includes('uq_category_recipe_prefix') || e.message.includes('violates unique constraint "uq_category_recipe_prefix"'))) {
          alert("Błąd: Prefiks przepisu w ramach wybranej kategorii nie jest unikalny. Spróbuj ponownie lub skontaktuj się z administratorem, jeśli problem się powtarza.");
      }
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      // Ingredients are deleted by cascade constraint in DB
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
      await fetchCategories(); 
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
      const cats = await fetchCategories(); 
      await fetchRecipes(cats); 
      return data as RecipeCategoryDB;
    } catch (e) {
      console.error("Error updating recipe category:", e);
      setErrorCategories(e as Error);
      return null;
    }
  };

  const deleteRecipeCategory = async (categoryId: string) => {
    try {
      // Update recipes using this category to set category_id to null
      // Only update category_id. category_name and category_code_prefix are derived.
      const { error: updateRecipesError } = await supabase
        .from('recipes')
        .update({ category_id: null }) 
        .eq('category_id', categoryId);

      if (updateRecipesError) {
        console.error("Error updating recipes before category deletion:", updateRecipesError);
        throw updateRecipesError;
      }

      const { error: deleteCategoryError } = await supabase
        .from('recipe_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteCategoryError) {
        console.error("Error deleting category:", deleteCategoryError);
        throw deleteCategoryError;
      }
      
      const cats = await fetchCategories(); 
      await fetchRecipes(cats); 
    } catch (e) {
      console.error("Error in deleteRecipeCategory process:", e);
      setErrorCategories(e as Error);
       // Provide more specific feedback if possible
      if (e instanceof Error && e.message.includes("constraint")) {
        alert("Nie można usunąć kategorii, ponieważ jest ona nadal używana lub wystąpił problem z relacjami w bazie danych.");
      } else {
        alert("Wystąpił błąd podczas usuwania kategorii.");
      }
    }
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
        .update({ 
            day: mealData.day,
            meal_type: mealData.meal_type,
            recipe_id: mealData.recipe_id,
            custom_meal_name: mealData.custom_meal_name,
            persons: mealData.persons, 
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

  const exportAllData = async (): Promise<ExportData | null> => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase.from('recipe_categories').select('*');
      if (categoriesError) throw categoriesError;

      const { data: unitsData, error: unitsError } = await supabase.from('units').select('*');
      if (unitsError) throw unitsError;

      const { data: recipesData, error: recipesError } = await supabase.from('recipes').select('*, ingredients(*)');
      if (recipesError) throw recipesError;
      
      const { data: plannedMealsData, error: plannedMealsError } = await supabase.from('planned_meals').select('*');
      if (plannedMealsError) throw plannedMealsError;

      return {
        version: 1,
        timestamp: new Date().toISOString(),
        recipe_categories: categoriesData || [],
        units: unitsData || [],
        recipes: recipesData || [],
        planned_meals: plannedMealsData || [],
      };
    } catch (e) {
      console.error("Error exporting data:", e);
      alert(`Błąd podczas eksportu danych: ${(e as Error).message}`);
      return null;
    }
  };

  const importAllData = async (data: ExportData): Promise<boolean> => {
    if (!data || !data.recipe_categories || !data.units || !data.recipes || !data.planned_meals) {
      alert("Nieprawidłowy format pliku importu.");
      return false;
    }

    try {
      // Delete existing data in order
      await supabase.from('planned_meals').delete().neq('id', crypto.randomUUID()); 
      await supabase.from('ingredients').delete().neq('id', crypto.randomUUID()); 
      await supabase.from('recipes').delete().neq('id', crypto.randomUUID());
      await supabase.from('units').delete().neq('id', crypto.randomUUID());
      await supabase.from('recipe_categories').delete().neq('id', crypto.randomUUID());

      // Import new data
      // It's important that imported IDs are valid UUIDs if the table expects them.
      // Supabase client `insert` can take an array of objects. If `id` is present, it attempts to use it.
      
      if (data.recipe_categories.length > 0) {
        const { error: catError } = await supabase.from('recipe_categories').insert(data.recipe_categories);
        if (catError) throw new Error(`Błąd importu kategorii: ${catError.message}`);
      }
      
      if (data.units.length > 0) {
        const { error: unitError } = await supabase.from('units').insert(data.units);
        if (unitError) throw new Error(`Błąd importu jednostek: ${unitError.message}`);
      }

      if (data.recipes.length > 0) {
        // Separate recipes from ingredients first, as ingredients need recipe_id
        const recipesToInsert = data.recipes.map(({ ingredients, ...recipe }) => recipe);
        const { error: recipeError } = await supabase.from('recipes').insert(recipesToInsert);
        if (recipeError) throw new Error(`Błąd importu przepisów: ${recipeError.message}`);
        
        // Now insert ingredients
        const allIngredientsToInsert: Omit<Ingredient, 'id'>[] = [];
        data.recipes.forEach(recipeWithIngredients => {
          if (recipeWithIngredients.ingredients && recipeWithIngredients.ingredients.length > 0) {
            recipeWithIngredients.ingredients.forEach(ingredient => {
              allIngredientsToInsert.push({
                // id: ingredient.id, // Let DB generate new ones or use if present and valid
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                recipe_id: recipeWithIngredients.id, // This uses the ID from the imported recipe
              });
            });
          }
        });
        if (allIngredientsToInsert.length > 0) {
            // It's better to let Supabase generate ingredient IDs if they aren't critical to preserve
            const finalIngredients = allIngredientsToInsert; 
            const { error: ingredientError } = await supabase.from('ingredients').insert(finalIngredients);
            if (ingredientError) throw new Error(`Błąd importu składników: ${ingredientError.message}`);
        }
      }
      
      if (data.planned_meals.length > 0) {
        const { error: plannerError } = await supabase.from('planned_meals').insert(data.planned_meals);
        if (plannerError) throw new Error(`Błąd importu planu posiłków: ${plannerError.message}`);
      }

      await refreshAllData(); // Refresh context state
      alert("Dane zostały pomyślnie zaimportowane!");
      return true;
    } catch (e) {
      console.error("Error importing data:", e);
      alert(`Błąd podczas importu danych: ${(e as Error).message}. Dane mogły zostać zaimportowane częściowo. Sprawdź konsolę, aby uzyskać więcej informacji.`);
      await refreshAllData(); // Refresh to show whatever state DB is in
      return false;
    }
  };


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
      refreshAllData,
      refreshRecipes: async () => { await fetchRecipes(recipeCategories); },
      refreshPlanner: async () => { await fetchPlanner(); },
      refreshCategories: async () => { await fetchCategories(); },
      refreshUnits: async () => { await fetchUnits(); },
      getAllIngredientNames,
      getAllRecipePersons,
      exportAllData,
      importAllData,
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
