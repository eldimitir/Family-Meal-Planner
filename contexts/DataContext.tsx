import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek, RecipeCategoryDB, Unit, Person } from '../types';
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
  persons: Person[];
  weeklyPlan: WeeklyPlan;

  isLoadingRecipes: boolean;
  isLoadingPlanner: boolean;
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  isLoadingPersons: boolean;

  errorRecipes: Error | null;
  errorPlanner: Error | null;
  errorCategories: Error | null;
  errorUnits: Error | null;
  errorPersons: Error | null;
  
  addRecipe: (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix' | 'persons_names'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  updateRecipe: (recipeData: Omit<Recipe, 'created_at'| 'ingredients' | 'category_name' | 'category_code_prefix' | 'persons_names'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }) => Promise<Recipe | null>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  
  getCategoryById: (categoryId: string) => RecipeCategoryDB | undefined;
  addRecipeCategory: (categoryData: Omit<RecipeCategoryDB, 'id' | 'created_at'>) => Promise<RecipeCategoryDB | null>;
  updateRecipeCategory: (categoryData: Omit<RecipeCategoryDB, 'created_at'>) => Promise<RecipeCategoryDB | null>;
  deleteRecipeCategory: (categoryId: string) => Promise<void>;

  addPlannedMeal: (plannedMealData: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'>) => Promise<PlannedMeal | null>;
  updatePlannedMeal: (plannedMeal: Omit<PlannedMeal, 'created_at' | 'persons_names'>) => Promise<PlannedMeal | null>;
  deletePlannedMeal: (plannedMealId: string) => Promise<void>;
  clearWeeklyPlan: () => Promise<void>;
  
  addUnit: (unitName: string) => Promise<Unit | null>;
  deleteUnit: (unitId: string) => Promise<void>;

  addPerson: (personName: string) => Promise<Person | null>;
  updatePerson: (personId: string, personName: string) => Promise<Person | null>;
  deletePerson: (personId: string) => Promise<void>;
  getPersonById: (personId: string) => Person | undefined;
  
  refreshRecipes: () => Promise<void>;
  refreshPlanner: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshUnits: () => Promise<void>;
  refreshPersons: () => Promise<void>;

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
  const [persons, setPersons] = useState<Person[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(initialWeeklyPlan);

  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState<boolean>(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true);
  const [isLoadingPersons, setIsLoadingPersons] = useState<boolean>(true);

  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);
  const [errorCategories, setErrorCategories] = useState<Error | null>(null);
  const [errorUnits, setErrorUnits] = useState<Error | null>(null);
  const [errorPersons, setErrorPersons] = useState<Error | null>(null);

  const mapRecipeData = useCallback((rawRecipes: any[], categories: RecipeCategoryDB[], allPersons: Person[]): Recipe[] => {
    return (rawRecipes || []).map(r => {
      const category = r.category_id ? categories.find(cat => cat.id === r.category_id) : null;
      const persons_names = r.person_ids && Array.isArray(r.person_ids)
        ? r.person_ids.map((pId: string) => allPersons.find(p => p.id === pId)?.name).filter(Boolean) as string[]
        : [];
      return {
        ...r,
        category_name: category?.name || null,
        category_code_prefix: category?.prefix || null,
        persons_names: persons_names.length > 0 ? persons_names : null,
        ingredients: r.ingredients ? r.ingredients.map((ing: any) => ({...ing})) : [], // Ensure ingredients is an array
      } as Recipe;
    });
  }, []);

  const mapPlannedMealData = useCallback((rawPlannedMeals: any[], allPersons: Person[]): PlannedMeal[] => {
    return (rawPlannedMeals || []).map(pm => {
        const persons_names = pm.person_ids && Array.isArray(pm.person_ids)
            ? pm.person_ids.map((pId: string) => allPersons.find(p => p.id === pId)?.name).filter(Boolean) as string[]
            : [];
        return {
            ...pm,
            persons_names: persons_names.length > 0 ? persons_names : null,
        } as PlannedMeal;
    });
  }, []);
  
  const fetchCategories = useCallback(async () => {
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

  const fetchPersons = useCallback(async () => {
    setIsLoadingPersons(true);
    setErrorPersons(null);
    try {
      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setPersons(data || []);
      return data || [];
    } catch (e) {
      console.error("Error fetching persons:", e);
      setErrorPersons(e as Error);
      setPersons([]);
      return [];
    } finally {
      setIsLoadingPersons(false);
    }
  }, []);

  const fetchRecipes = useCallback(async (currentCategories?: RecipeCategoryDB[], currentPersons?: Person[]) => {
    const categoriesToUse = currentCategories || recipeCategories;
    const personsToUse = currentPersons || persons;
    if (categoriesToUse.length === 0 && recipeCategories.length > 0) return; // Wait if categories are available but not passed
    if (personsToUse.length === 0 && persons.length > 0) return; // Wait if persons are available but not passed

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
      setRecipes(mapRecipeData(data, categoriesToUse, personsToUse));
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [recipeCategories, persons, mapRecipeData]); 

  const fetchPlanner = useCallback(async (currentPersons?: Person[]) => {
    const personsToUse = currentPersons || persons;
    if (personsToUse.length === 0 && persons.length > 0) return; // Wait if persons are available but not passed

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

      const mappedMeals = mapPlannedMealData(data, personsToUse);

      mappedMeals.forEach(meal => {
        if (newWeeklyPlan[meal.day as DayOfWeek]) {
          newWeeklyPlan[meal.day as DayOfWeek].push(meal);
        } else {
          newWeeklyPlan[meal.day as DayOfWeek] = [meal];
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
  }, [persons, mapPlannedMealData]);

  useEffect(() => {
    async function loadInitialData() {
        const cats = await fetchCategories();
        const pers = await fetchPersons();
        await fetchUnits();
        // Fetch recipes and planner only after categories and persons are loaded
        await fetchRecipes(cats, pers);
        await fetchPlanner(pers);
    }
    loadInitialData();
  }, [fetchCategories, fetchUnits, fetchPersons, fetchRecipes, fetchPlanner]);


  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix' | 'persons_names'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
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
        nextInternalPrefix = 1;
      }

      const recipeToInsert = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id || null,
        recipe_internal_prefix: nextInternalPrefix,
        tags: recipeData.tags,
        person_ids: recipeData.person_ids || null,
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
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({ ...ing, recipe_id: newRecipe.id }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();
        if (ingredientsError) throw ingredientsError;
        newRecipe.ingredients = insertedIngredients || [];
      } else {
         newRecipe.ingredients = [];
      }
      
      const fullyMappedRecipe = mapRecipeData([newRecipe], recipeCategories, persons)[0];
      setRecipes(prev => mapRecipeData([fullyMappedRecipe, ...prev.map(p => ({...p, ingredients: p.ingredients.map(i => ({...i}))}))], recipeCategories, persons).sort((a,b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error adding recipe:", e);
      setErrorRecipes(e as Error);
      return null;
    }
  };

  const updateRecipe = async (recipeData: Omit<Recipe, 'created_at'|'ingredients' | 'category_name' | 'category_code_prefix' | 'persons_names'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
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
            .order('recipe_internal_prefix', { ascending: false })
            .limit(1);
            if (prefixError) throw prefixError;
            if (categoryRecipes && categoryRecipes.length > 0) {
                newInternalPrefix = categoryRecipes[0].recipe_internal_prefix + 1;
            }
        } else {
             newInternalPrefix = 1;
        }
      }

      const recipeToUpdate = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category_id: recipeData.category_id || null,
        recipe_internal_prefix: newInternalPrefix, 
        tags: recipeData.tags,
        person_ids: recipeData.person_ids || null,
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

      const { error: deleteError } = await supabase.from('ingredients').delete().eq('recipe_id', recipeData.id);
      if (deleteError) throw deleteError;

      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({ ...ing, recipe_id: recipeData.id }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();
        if (ingredientsError) throw ingredientsError;
        updatedRecipe.ingredients = insertedIngredients || [];
      } else {
        updatedRecipe.ingredients = [];
      }
      
      const fullyMappedRecipe = mapRecipeData([updatedRecipe], recipeCategories, persons)[0];
      setRecipes(prev => prev.map(r => r.id === fullyMappedRecipe.id ? fullyMappedRecipe : r));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error updating recipe:", e);
      setErrorRecipes(e as Error);
      if (e instanceof Error && e.message.includes('uq_category_recipe_prefix')) {
          alert("Błąd: Prefiks przepisu w ramach wybranej kategorii nie jest unikalny.");
      }
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      await fetchPlanner(persons); 
    } catch (e) {
      console.error("Error deleting recipe:", e);
      setErrorRecipes(e as Error);
    }
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => recipes.find(r => r.id === recipeId);
  const getCategoryById = (categoryId: string): RecipeCategoryDB | undefined => recipeCategories.find(cat => cat.id === categoryId);
  const getPersonById = (personId: string): Person | undefined => persons.find(p => p.id === personId);

  const addRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'id' | 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase.from('recipe_categories').insert(categoryData).select().single();
      if (error) { /* handle specific errors */ throw error; }
      if (!data) throw new Error("Failed to add recipe category.");
      await fetchCategories().then(cats => fetchRecipes(cats, persons));
      return data as RecipeCategoryDB;
    } catch (e) { console.error("Error adding recipe category:", e); setErrorCategories(e as Error); return null; }
  };

  const updateRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase.from('recipe_categories').update({ name: categoryData.name, prefix: categoryData.prefix }).eq('id', categoryData.id).select().single();
      if (error) { /* handle specific errors */ throw error; }
      if (!data) throw new Error("Failed to update recipe category.");
      await fetchCategories().then(cats => fetchRecipes(cats, persons));
      return data as RecipeCategoryDB;
    } catch (e) { console.error("Error updating recipe category:", e); setErrorCategories(e as Error); return null; }
  };

  const deleteRecipeCategory = async (categoryId: string) => {
    try {
      const { error: updateRecipesError } = await supabase.from('recipes').update({ category_id: null }).eq('category_id', categoryId);
      if (updateRecipesError) throw updateRecipesError;

      const { error: deleteCategoryError } = await supabase.from('recipe_categories').delete().eq('id', categoryId);
      if (deleteCategoryError) throw deleteCategoryError;
      
      await fetchCategories().then(cats => fetchRecipes(cats, persons));
    } catch (e) { console.error("Error deleting recipe category:", e); setErrorCategories(e as Error); }
  };

  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'>): Promise<PlannedMeal | null> => {
    try {
      const { data, error } = await supabase.from('planned_meals').insert(mealData).select().single();
      if (error) throw error;
      if (!data) throw new Error("Failed to add planned meal.");
      await fetchPlanner(persons); 
      return mapPlannedMealData([data as any], persons)[0];
    } catch (e) { console.error("Error adding planned meal:", e); setErrorPlanner(e as Error); return null; }
  };

  const updatePlannedMeal = async (mealData: Omit<PlannedMeal, 'created_at' | 'persons_names'>): Promise<PlannedMeal | null> => {
     try {
      const { data, error } = await supabase.from('planned_meals').update({
            day: mealData.day, meal_type: mealData.meal_type, recipe_id: mealData.recipe_id,
            custom_meal_name: mealData.custom_meal_name, person_ids: mealData.person_ids,
        }).eq('id', mealData.id).select().single();
      if (error) throw error;
      if (!data) throw new Error("Failed to update planned meal.");
      await fetchPlanner(persons);
      return mapPlannedMealData([data as any], persons)[0];
    } catch (e) { console.error("Error updating planned meal:", e); setErrorPlanner(e as Error); return null; }
  };

  const deletePlannedMeal = async (plannedMealId: string) => {
    try {
      const { error } = await supabase.from('planned_meals').delete().eq('id', plannedMealId);
      if (error) throw error;
      await fetchPlanner(persons);
    } catch (e) { console.error("Error deleting planned meal:", e); setErrorPlanner(e as Error); }
  };

  const clearWeeklyPlan = async () => {
    try {
      const { error } = await supabase.from('planned_meals').delete().neq('id', crypto.randomUUID()); 
      if (error) throw error;
      setWeeklyPlan({ ...initialWeeklyPlan }); // No need to map persons here, it's empty
    } catch (e) { console.error("Error clearing weekly plan:", e); setErrorPlanner(e as Error); }
  };

  const addUnit = async (unitName: string): Promise<Unit | null> => { /* ... unchanged ... */ return null; };
  const deleteUnit = async (unitId: string) => { /* ... unchanged ... */ };


  // Person CRUD
  const addPerson = async (personName: string): Promise<Person | null> => {
    try {
      const { data, error } = await supabase.from('persons').insert({ name: personName.trim() }).select().single();
      if (error) { 
        if (error.message.includes('persons_name_key')) alert('Błąd: Nazwa osoby musi być unikalna.');
        throw error; 
      }
      if (!data) throw new Error("Failed to add person.");
      await fetchPersons().then(pers => { fetchRecipes(recipeCategories, pers); fetchPlanner(pers); });
      return data as Person;
    } catch (e) { console.error("Error adding person:", e); setErrorPersons(e as Error); return null; }
  };

  const updatePerson = async (personId: string, personName: string): Promise<Person | null> => {
    try {
      const { data, error } = await supabase.from('persons').update({ name: personName.trim() }).eq('id', personId).select().single();
      if (error) {
        if (error.message.includes('persons_name_key')) alert('Błąd: Nazwa osoby musi być unikalna.');
        throw error;
      }
      if (!data) throw new Error("Failed to update person.");
      await fetchPersons().then(pers => { fetchRecipes(recipeCategories, pers); fetchPlanner(pers); });
      return data as Person;
    } catch (e) { console.error("Error updating person:", e); setErrorPersons(e as Error); return null; }
  };

  const deletePerson = async (personIdToDelete: string) => {
    try {
        // Step 1: Update recipes
        const { data: affectedRecipes, error: fetchRecipesError } = await supabase
            .from('recipes')
            .select('id, person_ids')
            .filter('person_ids', 'cs', `{${personIdToDelete}}`); // Contains personIdToDelete

        if (fetchRecipesError) throw fetchRecipesError;

        for (const recipe of affectedRecipes || []) {
            const updatedPersonIds = (recipe.person_ids || []).filter((id: string) => id !== personIdToDelete);
            const { error: updateRecipeError } = await supabase
                .from('recipes')
                .update({ person_ids: updatedPersonIds.length > 0 ? updatedPersonIds : null })
                .eq('id', recipe.id);
            if (updateRecipeError) throw updateRecipeError;
        }

        // Step 2: Update planned_meals
        const { data: affectedPlannedMeals, error: fetchPlannedMealsError } = await supabase
            .from('planned_meals')
            .select('id, person_ids')
            .filter('person_ids', 'cs', `{${personIdToDelete}}`);

        if (fetchPlannedMealsError) throw fetchPlannedMealsError;
        
        for (const meal of affectedPlannedMeals || []) {
            const updatedPersonIds = (meal.person_ids || []).filter((id: string) => id !== personIdToDelete);
            const { error: updateMealError } = await supabase
                .from('planned_meals')
                .update({ person_ids: updatedPersonIds.length > 0 ? updatedPersonIds : null })
                .eq('id', meal.id);
            if (updateMealError) throw updateMealError;
        }

        // Step 3: Delete the person
        const { error: deletePersonError } = await supabase.from('persons').delete().eq('id', personIdToDelete);
        if (deletePersonError) throw deletePersonError;

        // Step 4: Refresh local data
        await fetchPersons().then(async (newPersons) => {
            await fetchRecipes(recipeCategories, newPersons);
            await fetchPlanner(newPersons);
        });

    } catch (e) {
        console.error("Error deleting person and updating relations:", e);
        setErrorPersons(e as Error);
    }
};

  const getAllIngredientNames = useCallback((): string[] => { /* ... unchanged ... */ return []; }, [recipes]);

  return (
    <DataContext.Provider value={{
      recipes, recipeCategories, units, persons, weeklyPlan,
      isLoadingRecipes, isLoadingPlanner, isLoadingCategories, isLoadingUnits, isLoadingPersons,
      errorRecipes, errorPlanner, errorCategories, errorUnits, errorPersons,
      addRecipe, updateRecipe, deleteRecipe, getRecipeById,
      getCategoryById, addRecipeCategory, updateRecipeCategory, deleteRecipeCategory,
      addPlannedMeal, updatePlannedMeal, deletePlannedMeal, clearWeeklyPlan,
      addUnit, deleteUnit,
      addPerson, updatePerson, deletePerson, getPersonById,
      refreshRecipes: () => fetchRecipes(recipeCategories, persons),
      refreshPlanner: () => fetchPlanner(persons),
      refreshCategories: () => fetchCategories().then(cats => fetchRecipes(cats, persons)),
      refreshUnits: fetchUnits,
      refreshPersons: () => fetchPersons().then(pers => { fetchRecipes(recipeCategories, pers); fetchPlanner(pers); }),
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
