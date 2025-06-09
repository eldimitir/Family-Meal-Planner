
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek, RecipeCategoryDB, Unit, Person,
  ArchivedPlan, FullExportData, RecipeForExport, PlannedMealForExport, ArchivedPlanForExport, RecipeDbIngredient, ArchivedMealData
} from '../types';
import { DAYS_OF_WEEK, SUPABASE_URL, SUPABASE_ANON_KEY, MEAL_TYPES } from '../constants';

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
  archivedPlans: ArchivedPlan[];

  isLoadingRecipes: boolean;
  isLoadingPlanner: boolean;
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  isLoadingPersons: boolean;
  isLoadingArchivedPlans: boolean;
  isArchivingPlan: boolean; 

  errorRecipes: Error | null;
  errorPlanner: Error | null;
  errorCategories: Error | null;
  errorUnits: Error | null;
  errorPersons: Error | null;
  errorArchivedPlans: Error | null;
  errorArchivingPlan: Error | null; 
  
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
  refreshArchivedPlans: () => Promise<void>;

  getAllIngredientNames: () => string[];

  archiveCurrentPlan: (name: string) => Promise<ArchivedPlan | null>;
  restorePlan: (planId: string) => Promise<void>;
  deleteArchivedPlan: (planId: string) => Promise<void>;

  exportAllData: () => Promise<FullExportData | null>;
  importAllData: (data: FullExportData) => Promise<boolean>;
  loadInitialData: () => Promise<void>;
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
  const [archivedPlans, setArchivedPlans] = useState<ArchivedPlan[]>([]);

  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState<boolean>(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true);
  const [isLoadingPersons, setIsLoadingPersons] = useState<boolean>(true);
  const [isLoadingArchivedPlans, setIsLoadingArchivedPlans] = useState<boolean>(true);
  const [isArchivingPlan, setIsArchivingPlan] = useState<boolean>(false);

  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);
  const [errorCategories, setErrorCategories] = useState<Error | null>(null);
  const [errorUnits, setErrorUnits] = useState<Error | null>(null);
  const [errorPersons, setErrorPersons] = useState<Error | null>(null);
  const [errorArchivedPlans, setErrorArchivedPlans] = useState<Error | null>(null);
  const [errorArchivingPlan, setErrorArchivingPlan] = useState<Error | null>(null);

  const mapRecipeData = useCallback((rawRecipes: any[], categories: RecipeCategoryDB[], allPersons: Person[]): Recipe[] => {
    return (rawRecipes || []).map(r => {
      const category = r.category_id ? categories.find(cat => cat.id === r.category_id) : null;
      const persons_names = r.person_ids && Array.isArray(r.person_ids)
        ? r.person_ids.map((pId: string) => allPersons.find(p => p.id === pId)?.name).filter(Boolean) as string[]
        : [];
      return {
        ...r,
        id: r.id, 
        category_name: category?.name || null,
        category_code_prefix: category?.prefix || null,
        persons_names: persons_names.length > 0 ? persons_names : null,
        ingredients: r.ingredients ? r.ingredients.map((ing: any) => ({...ing, id: ing.id })) : [], 
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
            id: pm.id, 
            persons_names: persons_names.length > 0 ? persons_names : null,
        } as PlannedMeal; 
    });
  }, []);
  
  const fetchCategories = useCallback(async (forceRefresh = false): Promise<RecipeCategoryDB[]> => {
    if (isLoadingCategories && !forceRefresh) {
      return recipeCategories;
    }
    if (recipeCategories.length > 0 && !forceRefresh) {
      return recipeCategories;
    }
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
      setRecipeCategories([]); // Ensure state is reset on error
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, [recipeCategories, isLoadingCategories]);

  const fetchUnits = useCallback(async (forceRefresh = false): Promise<Unit[]> => {
    if (isLoadingUnits && !forceRefresh) {
      return units;
    }
    if (units.length > 0 && !forceRefresh) {
      return units;
    }
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
  }, [units, isLoadingUnits]);

  const fetchPersons = useCallback(async (forceRefresh = false): Promise<Person[]> => {
    if (isLoadingPersons && !forceRefresh) {
      return persons;
    }
    if (persons.length > 0 && !forceRefresh) {
      return persons;
    }
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
  }, [persons, isLoadingPersons]);

  const getRecipeById = useCallback((recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  }, [recipes]);

  const getPersonById = useCallback((personId: string): Person | undefined => {
    return persons.find(p => p.id === personId);
  }, [persons]);

  const fetchRecipes = useCallback(async (forceRefresh = false, currentCategoriesParam?: RecipeCategoryDB[], currentPersonsParam?: Person[]) => {
    if (isLoadingRecipes && !forceRefresh) {
      return recipes;
    }
    if (recipes.length > 0 && !forceRefresh) {
      return recipes;
    }
    setIsLoadingRecipes(true);
    setErrorRecipes(null);
    
    const categoriesToUse = currentCategoriesParam || (recipeCategories.length > 0 ? recipeCategories : await fetchCategories());
    const personsToUse = currentPersonsParam || (persons.length > 0 ? persons : await fetchPersons());

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients (*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedData = mapRecipeData(data || [], categoriesToUse, personsToUse);
      setRecipes(mappedData);
      return mappedData; // Return the newly fetched and mapped data
    } catch (e) {
      console.error("Error fetching recipes:", e);
      setErrorRecipes(e as Error);
      setRecipes([]);
      return [];
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [recipes, isLoadingRecipes, recipeCategories, persons, mapRecipeData, fetchCategories, fetchPersons]); 

  const fetchPlanner = useCallback(async (forceRefresh = false, currentPersonsParam?: Person[]) => {
    if (isLoadingPlanner && !forceRefresh) {
      return weeklyPlan;
    }
    const planHasItems = Object.values(weeklyPlan).some(dayMeals => dayMeals.length > 0);
    if (planHasItems && !forceRefresh) {
      return weeklyPlan;
    }
    setIsLoadingPlanner(true);
    setErrorPlanner(null);
    const personsToUse = currentPersonsParam || (persons.length > 0 ? persons : await fetchPersons());

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

      const mappedMeals = mapPlannedMealData(data || [], personsToUse);

      mappedMeals.forEach(meal => {
        if (newWeeklyPlan[meal.day as DayOfWeek]) {
          newWeeklyPlan[meal.day as DayOfWeek].push(meal);
        } else {
          newWeeklyPlan[meal.day as DayOfWeek] = [meal];
        }
      });
      setWeeklyPlan(newWeeklyPlan);
      return newWeeklyPlan;

    } catch (e) {
      console.error("Error fetching planner data:", e);
      setErrorPlanner(e as Error);
      setWeeklyPlan({...initialWeeklyPlan});
      return ({...initialWeeklyPlan});
    } finally {
      setIsLoadingPlanner(false);
    }
  }, [weeklyPlan, isLoadingPlanner, persons, mapPlannedMealData, fetchPersons]);

  const fetchArchivedPlans = useCallback(async (forceRefresh = false) => {
    if (isLoadingArchivedPlans && !forceRefresh) {
        return archivedPlans;
    }
    if (archivedPlans.length > 0 && !forceRefresh) {
        return archivedPlans;
    }
    setIsLoadingArchivedPlans(true);
    setErrorArchivedPlans(null);
    try {
        const { data, error } = await supabase
            .from('archived_plans')
            .select('*')
            .order('archived_at', { ascending: false });
        if (error) throw error;
        setArchivedPlans(data || []);
        return data || [];
    } catch (e) {
        console.error("Error fetching archived plans:", e);
        setErrorArchivedPlans(e as Error);
        setArchivedPlans([]);
        return [];
    } finally {
        setIsLoadingArchivedPlans(false);
    }
  }, [archivedPlans, isLoadingArchivedPlans]);

  const refreshRecipes = useCallback(async () => {
    const currentCats = await fetchCategories(true);
    const currentPers = await fetchPersons(true);
    await fetchRecipes(true, currentCats, currentPers);
  }, [fetchRecipes, fetchCategories, fetchPersons]);

  const refreshPlanner = useCallback(async () => {
    const currentPers = await fetchPersons(true);
    await fetchPlanner(true, currentPers);
  }, [fetchPlanner, fetchPersons]);

  const refreshCategories = useCallback(async () => {
    const refreshedCats = await fetchCategories(true);
    const currentPers = await fetchPersons(true); 
    await fetchRecipes(true, refreshedCats, currentPers);
  }, [fetchCategories, fetchRecipes, fetchPersons]);

  const refreshUnits = useCallback(async () => { await fetchUnits(true); }, [fetchUnits]);

  const refreshPersons = useCallback(async () => {
    const refreshedPers = await fetchPersons(true);
    const currentCats = await fetchCategories(true); 
    await fetchRecipes(true, currentCats, refreshedPers);
    await fetchPlanner(true, refreshedPers);
  }, [fetchPersons, fetchRecipes, fetchPlanner, fetchCategories]);
  
  const refreshArchivedPlans = useCallback(async () => { 
      await fetchArchivedPlans(true); 
  }, [fetchArchivedPlans]);


  const loadInitialData = useCallback(async () => {
      // Set all loading states to true initially to prevent race conditions from individual component loads
      setIsLoadingCategories(true); setIsLoadingPersons(true); setIsLoadingUnits(true);
      setIsLoadingRecipes(true); setIsLoadingPlanner(true); setIsLoadingArchivedPlans(true);

      // Fetch foundational data first
      const localCats = await fetchCategories(true); 
      const localPers = await fetchPersons(true);   
      await fetchUnits(true);                     
      await fetchArchivedPlans(true); // Fetch archived plans early
      
      // Then fetch data that depends on the foundational data
      await fetchRecipes(true, localCats, localPers); 
      await fetchPlanner(true, localPers);       
      
      // Explicitly set loading states to false after all initial data is intended to be loaded
      setIsLoadingCategories(false); setIsLoadingPersons(false); setIsLoadingUnits(false);
      setIsLoadingRecipes(false); setIsLoadingPlanner(false); setIsLoadingArchivedPlans(false);
  }, [fetchCategories, fetchPersons, fetchUnits, fetchArchivedPlans, fetchRecipes, fetchPlanner]);


  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]); // loadInitialData is memoized, so this runs once on mount

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
        const { data: uncategorizedRecipes, error: prefixError } = await supabase
          .from('recipes')
          .select('recipe_internal_prefix')
          .is('category_id', null)
          .order('recipe_internal_prefix', { ascending: false })
          .limit(1);
        if (prefixError) throw prefixError;
        if (uncategorizedRecipes && uncategorizedRecipes.length > 0) {
            nextInternalPrefix = uncategorizedRecipes[0].recipe_internal_prefix + 1;
        } else {
            nextInternalPrefix = 1;
        }
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
      let newRecipeFromDB = recipeResult as any; 

      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({ ...ing, recipe_id: newRecipeFromDB.id }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();
        if (ingredientsError) throw ingredientsError;
        newRecipeFromDB.ingredients = insertedIngredients || [];
      } else {
         newRecipeFromDB.ingredients = [];
      }
      
      // Update local state directly instead of full refresh
      const currentCats = recipeCategories.length > 0 ? recipeCategories : await fetchCategories();
      const currentPers = persons.length > 0 ? persons : await fetchPersons();
      const fullyMappedRecipe = mapRecipeData([newRecipeFromDB], currentCats, currentPers)[0];
      setRecipes(prev => mapRecipeData([newRecipeFromDB, ...prev.filter(p => p.id !== newRecipeFromDB.id)], currentCats, currentPers).sort((a,b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; 
        }));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error adding recipe:", e);
      setErrorRecipes(e as Error);
       if (e instanceof Error && (e.message.includes('uq_category_recipe_prefix') || e.message.includes('recipes_null_category_internal_prefix_idx'))) {
          alert("Błąd: Prefiks przepisu w ramach wybranej kategorii (lub dla przepisów bez kategorii) musi być unikalny. Spróbuj ponownie lub zmień kategorię.");
      }
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
             const { data: uncategorizedRecipes, error: prefixError } = await supabase
              .from('recipes')
              .select('recipe_internal_prefix')
              .is('category_id', null)
              .order('recipe_internal_prefix', { ascending: false })
              .limit(1);
            if (prefixError) throw prefixError;
            if (uncategorizedRecipes && uncategorizedRecipes.length > 0) {
                newInternalPrefix = uncategorizedRecipes[0].recipe_internal_prefix + 1;
            } else { 
                newInternalPrefix = 1;
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
      let updatedRecipeFromDB = updatedRecipeResult as any;

      const { error: deleteError } = await supabase.from('ingredients').delete().eq('recipe_id', recipeData.id);
      if (deleteError) throw deleteError;

      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientsToInsert = recipeData.ingredients.map(ing => ({ ...ing, recipe_id: recipeData.id }));
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsToInsert)
          .select();
        if (ingredientsError) throw ingredientsError;
        updatedRecipeFromDB.ingredients = insertedIngredients || [];
      } else {
        updatedRecipeFromDB.ingredients = [];
      }
      
      const currentCats = recipeCategories.length > 0 ? recipeCategories : await fetchCategories();
      const currentPers = persons.length > 0 ? persons : await fetchPersons();
      const fullyMappedRecipe = mapRecipeData([updatedRecipeFromDB], currentCats, currentPers)[0];
      setRecipes(prev => prev.map(r => r.id === fullyMappedRecipe.id ? fullyMappedRecipe : r).sort((a,b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; 
        }));
      return fullyMappedRecipe;
    } catch (e) {
      console.error("Error updating recipe:", e);
      setErrorRecipes(e as Error);
      if (e instanceof Error && (e.message.includes('uq_category_recipe_prefix') || e.message.includes('recipes_null_category_internal_prefix_idx'))) {
          alert("Błąd: Prefiks przepisu w ramach wybranej kategorii (lub dla przepisów bez kategorii) musi być unikalny. Zmiana kategorii mogła spowodować konflikt.");
      }
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      // Planner might contain this recipe, refresh it
      const currentPers = persons.length > 0 ? persons : await fetchPersons();
      await fetchPlanner(true, currentPers);
    } catch (e) {
      console.error("Error deleting recipe:", e);
      setErrorRecipes(e as Error);
    }
  };

  const getCategoryById = (categoryId: string): RecipeCategoryDB | undefined => recipeCategories.find(cat => cat.id === categoryId);

  const addRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'id' | 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase.from('recipe_categories').insert(categoryData).select().single();
      if (error) { 
        if (error.message.includes('recipe_categories_prefix_key')) alert("Błąd: Prefiks kategorii musi być unikalny.");
        if (error.message.includes('recipe_categories_name_key')) alert("Błąd: Nazwa kategorii musi być unikalna.");
        throw error; 
      }
      if (!data) throw new Error("Failed to add recipe category.");
      await refreshCategories(); 
      return data as RecipeCategoryDB;
    } catch (e) { console.error("Error adding recipe category:", e); setErrorCategories(e as Error); return null; }
  };

  const updateRecipeCategory = async (categoryData: Omit<RecipeCategoryDB, 'created_at'>): Promise<RecipeCategoryDB | null> => {
    try {
      const { data, error } = await supabase.from('recipe_categories').update({ name: categoryData.name, prefix: categoryData.prefix }).eq('id', categoryData.id).select().single();
      if (error) { 
        if (error.message.includes('recipe_categories_prefix_key')) alert("Błąd: Prefiks kategorii musi być unikalny.");
        if (error.message.includes('recipe_categories_name_key')) alert("Błąd: Nazwa kategorii musi być unikalna.");
        throw error; 
      }
      if (!data) throw new Error("Failed to update recipe category.");
      await refreshCategories(); 
      return data as RecipeCategoryDB;
    } catch (e) { console.error("Error updating recipe category:", e); setErrorCategories(e as Error); return null; }
  };

  const deleteRecipeCategory = async (categoryId: string) => {
    try {
      // First, update recipes that use this category to set category_id to null
      const { error: updateRecipesError } = await supabase
        .from('recipes')
        .update({ category_id: null })
        .eq('category_id', categoryId);
      if (updateRecipesError) throw updateRecipesError;

      // Then delete the category
      const { error: deleteCategoryError } = await supabase.from('recipe_categories').delete().eq('id', categoryId);
      if (deleteCategoryError) throw deleteCategoryError;
      
      await refreshCategories(); 
    } catch (e) { console.error("Error deleting recipe category:", e); setErrorCategories(e as Error); }
  };

  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'>): Promise<PlannedMeal | null> => {
    try {
      const { data, error } = await supabase.from('planned_meals').insert(mealData).select().single();
      if (error) throw error;
      if (!data) throw new Error("Failed to add planned meal.");
      
      const currentPers = persons.length > 0 ? persons : await fetchPersons();
      const newMeal = mapPlannedMealData([data as any], currentPers)[0];

      setWeeklyPlan(prevPlan => {
          const dayMeals = [...(prevPlan[newMeal.day as DayOfWeek] || []), newMeal];
          return { ...prevPlan, [newMeal.day as DayOfWeek]: dayMeals };
      });
      return newMeal;
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
      
      const currentPers = persons.length > 0 ? persons : await fetchPersons();
      const updatedMeal = mapPlannedMealData([data as any], currentPers)[0];

      setWeeklyPlan(prevPlan => {
          const dayMeals = (prevPlan[updatedMeal.day as DayOfWeek] || []).map(m => m.id === updatedMeal.id ? updatedMeal : m);
          return { ...prevPlan, [updatedMeal.day as DayOfWeek]: dayMeals };
      });
      return updatedMeal;
    } catch (e) { console.error("Error updating planned meal:", e); setErrorPlanner(e as Error); return null; }
  };

  const deletePlannedMeal = async (plannedMealId: string) => {
    try {
      const { error } = await supabase.from('planned_meals').delete().eq('id', plannedMealId);
      if (error) throw error;
      // Optimistically update or just refresh
      setWeeklyPlan(prevPlan => {
        const newPlan = { ...prevPlan };
        for (const day in newPlan) {
            newPlan[day as DayOfWeek] = newPlan[day as DayOfWeek].filter(m => m.id !== plannedMealId);
        }
        return newPlan;
      });
    } catch (e) { console.error("Error deleting planned meal:", e); setErrorPlanner(e as Error); }
  };

  const clearWeeklyPlan = async () => {
    try {
      const { error } = await supabase.from('planned_meals').delete().neq('id', crypto.randomUUID()); 
      if (error) throw error;
      setWeeklyPlan({ ...initialWeeklyPlan }); 
    } catch (e) { console.error("Error clearing weekly plan:", e); setErrorPlanner(e as Error); }
  };

  const addUnit = async (unitName: string): Promise<Unit | null> => {
    try {
      const { data, error } = await supabase.from('units').insert({ name: unitName.trim() }).select().single();
      if (error) {
        if (error.message.includes('units_name_key')) alert('Błąd: Nazwa jednostki musi być unikalna.');
        throw error;
      }
      if (!data) throw new Error("Failed to add unit.");
      setUnits(prev => [...prev, data as Unit].sort((a,b) => a.name.localeCompare(b.name)));
      return data as Unit;
    } catch(e) { console.error("Error adding unit:", e); setErrorUnits(e as Error); return null; }
  };

  const deleteUnit = async (unitId: string) => {
    try {
        const { error } = await supabase.from('units').delete().eq('id', unitId);
        if (error) throw error;
        setUnits(prev => prev.filter(u => u.id !== unitId));
    } catch (e) { console.error("Error deleting unit:", e); setErrorUnits(e as Error); }
  };

  const addPerson = async (personName: string): Promise<Person | null> => {
    try {
      const { data, error } = await supabase.from('persons').insert({ name: personName.trim() }).select().single();
      if (error) { 
        if (error.message.includes('persons_name_key')) alert('Błąd: Nazwa osoby musi być unikalna.');
        throw error; 
      }
      if (!data) throw new Error("Failed to add person.");
      await refreshPersons(); 
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
      await refreshPersons();
      return data as Person;
    } catch (e) { console.error("Error updating person:", e); setErrorPersons(e as Error); return null; }
  };

  const deletePerson = async (personIdToDelete: string) => {
    try {
        // Update related recipes
        const { data: affectedRecipesDB, error: fetchRecipesError } = await supabase
            .from('recipes')
            .select('id, person_ids')
            .filter('person_ids', 'cs', `{${personIdToDelete}}`); 

        if (fetchRecipesError) throw fetchRecipesError;

        for (const recipe of affectedRecipesDB || []) {
            const updatedPersonIds = (recipe.person_ids || []).filter((id: string) => id !== personIdToDelete);
            const { error: updateRecipeError } = await supabase
                .from('recipes')
                .update({ person_ids: updatedPersonIds.length > 0 ? updatedPersonIds : null })
                .eq('id', recipe.id);
            if (updateRecipeError) throw updateRecipeError;
        }

        // Update related planned meals
        const { data: affectedPlannedMealsDB, error: fetchPlannedMealsError } = await supabase
            .from('planned_meals')
            .select('id, person_ids')
            .filter('person_ids', 'cs', `{${personIdToDelete}}`);

        if (fetchPlannedMealsError) throw fetchPlannedMealsError;
        
        for (const meal of affectedPlannedMealsDB || []) {
            const updatedPersonIds = (meal.person_ids || []).filter((id: string) => id !== personIdToDelete);
            const { error: updateMealError } = await supabase
                .from('planned_meals')
                .update({ person_ids: updatedPersonIds.length > 0 ? updatedPersonIds : null })
                .eq('id', meal.id);
            if (updateMealError) throw updateMealError;
        }

        // Delete the person
        const { error: deletePersonError } = await supabase.from('persons').delete().eq('id', personIdToDelete);
        if (deletePersonError) throw deletePersonError;

        // Refresh persons and dependent data (recipes, planner will be updated)
        await refreshPersons();

    } catch (e) {
        console.error("Error deleting person and updating relations:", e);
        setErrorPersons(e as Error);
    }
  };

  const archiveCurrentPlan = async (name: string): Promise<ArchivedPlan | null> => {
    setIsArchivingPlan(true);
    setErrorArchivingPlan(null);
    try {
        const planToArchive: Record<DayOfWeek, ArchivedMealData[]> = {} as Record<DayOfWeek, ArchivedMealData[]>;
        for (const day of DAYS_OF_WEEK) {
            planToArchive[day] = (weeklyPlan[day] || []).map(meal => {
                const { id, created_at, persons_names, ...restOfMeal } = meal; // Exclude UI-specific or DB-generated fields
                return restOfMeal; 
            });
        }

        const { data, error } = await supabase
            .from('archived_plans')
            .insert({ name, plan_data: planToArchive })
            .select()
            .single();
        if (error) throw error;
        if (!data) throw new Error("Failed to archive plan.");
        setArchivedPlans(prev => [data as ArchivedPlan, ...prev].sort((a,b) => new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime()));
        return data as ArchivedPlan;
    } catch (e) {
        console.error("Error archiving plan:", e);
        setErrorArchivingPlan(e as Error);
        return null;
    } finally {
        setIsArchivingPlan(false);
    }
  };

  const restorePlan = async (planId: string) => {
      setIsLoadingPlanner(true); 
      setErrorPlanner(null);
      try {
          const planToRestore = archivedPlans.find(p => p.id === planId);
          if (!planToRestore) throw new Error("Archived plan not found.");

          await clearWeeklyPlan(); 

          const mealsToInsert: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'>[] = [];

          for (const day of DAYS_OF_WEEK) {
              const dayMealsFromArchive: ArchivedMealData[] = planToRestore.plan_data[day as DayOfWeek] || [];
              if (dayMealsFromArchive && dayMealsFromArchive.length > 0) {
                  dayMealsFromArchive.forEach(archivedMeal => {
                      let validRecipeId = archivedMeal.recipe_id;
                      if (validRecipeId && !getRecipeById(validRecipeId)) {
                          validRecipeId = null; // Recipe no longer exists
                      }
                      
                      let validPersonIds = archivedMeal.person_ids;
                      if (validPersonIds && validPersonIds.length > 0) {
                          validPersonIds = validPersonIds.filter(pId => !!getPersonById(pId)); // Person no longer exists
                          if (validPersonIds.length === 0) validPersonIds = null;
                      }

                      const mealForDb: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'> = {
                          day: day,
                          meal_type: archivedMeal.meal_type,
                          recipe_id: validRecipeId,
                          custom_meal_name: validRecipeId ? undefined : (archivedMeal.custom_meal_name || "Archived Custom Meal"),
                          person_ids: validPersonIds,
                      };
                      mealsToInsert.push(mealForDb);
                  });
              }
          }

          if (mealsToInsert.length > 0) {
              const { error: insertError } = await supabase
                  .from('planned_meals')
                  .insert(mealsToInsert);
              if (insertError) throw insertError;
          }

          // Refresh planner from DB to get new IDs and ensure consistency
          const currentPers = persons.length > 0 ? persons : await fetchPersons(true);
          await fetchPlanner(true, currentPers);
          alert("Plan został pomyślnie przywrócony.");

      } catch (e) {
          console.error("Error restoring plan:", e);
          setErrorPlanner(e as Error);
          alert(`Nie udało się przywrócić planu: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
          setIsLoadingPlanner(false);
      }
  };

  const deleteArchivedPlan = async (planId: string) => {
    try {
        const { error } = await supabase
            .from('archived_plans')
            .delete()
            .eq('id', planId);
        if (error) throw error;
        setArchivedPlans(prev => prev.filter(p => p.id !== planId));
        alert("Zarchiwizowany plan został usunięty.");
    } catch (e) {
        console.error("Error deleting archived plan:", e);
        setErrorArchivedPlans(e as Error); // Use dedicated error state
        alert(`Nie udało się usunąć zarchiwizowanego planu: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const getAllIngredientNames = useCallback((): string[] => {
    const allNames = new Set<string>();
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        allNames.add(ingredient.name.trim());
      });
    });
    return Array.from(allNames).sort();
  }, [recipes]);

  const exportAllData = async (): Promise<FullExportData | null> => {
    try {
      const catsToExport = await fetchCategories(true); // Always fetch fresh for export
      const unitsToExport = await fetchUnits(true);
      const personsToExport = await fetchPersons(true);
      // Fetch fresh recipes ensuring they are mapped with fresh cats/persons
      const recipesRawFromDB = await fetchRecipes(true, catsToExport, personsToExport); 
      // Ensure recipes state is updated before using it for recipesFromDB mapping
      // The fetchRecipes now returns the mapped data, use that
      const recipesFromDB = recipesRawFromDB as Recipe[];


      const currentPlanMeals: PlannedMealForExport[] = [];
      Object.values(weeklyPlan).flat().forEach(pm => { // Use current state of weeklyPlan
        const { id, created_at, persons_names, ...restOfPm } = pm;
        currentPlanMeals.push(restOfPm);
      });

      const archivedToExport = await fetchArchivedPlans(true);
      
      const recipesForExport: RecipeForExport[] = recipesFromDB.map(r => {
        const { category_name, category_code_prefix, persons_names, ingredients, ...restOfRecipe } = r;
        const db_ingredients: RecipeDbIngredient[] = ingredients?.map((ing: any) => {
            const { id, recipe_id, ...restOfIng } = ing;
            return restOfIng;
          }) || [];
        return { ...restOfRecipe, db_ingredients };
      });

      const archivedPlansForExport: ArchivedPlanForExport[] = archivedToExport.map(ap => {
        const { id, archived_at, ...restOfAp } = ap;
        return restOfAp as ArchivedPlanForExport;
      });

      return {
        recipeCategories: catsToExport,
        units: unitsToExport,
        persons: personsToExport,
        recipes: recipesForExport,
        plannedMeals: currentPlanMeals,
        archivedPlans: archivedPlansForExport,
      };
    } catch (e) {
      console.error("Error exporting data:", e);
      alert(`Błąd podczas eksportu danych: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };

  const importAllData = async (data: FullExportData): Promise<boolean> => {
    if (!window.confirm("Jesteś pewien, że chcesz zaimportować dane? WSZYSTKIE obecne dane (przepisy, plany, kategorie, osoby, jednostki, zarchiwizowane plany) zostaną USUNIĘTE i zastąpione danymi z pliku. Tej operacji NIE MOŻNA COFNĄĆ.")) {
      return false;
    }
    
    // Set global loading flags during import
    setIsLoadingCategories(true); setIsLoadingUnits(true); setIsLoadingPersons(true);
    setIsLoadingRecipes(true); setIsLoadingPlanner(true); setIsLoadingArchivedPlans(true);
    
    try {
      // Clear all tables in correct order
      await supabase.from('ingredients').delete().neq('id', crypto.randomUUID());
      await supabase.from('planned_meals').delete().neq('id', crypto.randomUUID());
      await supabase.from('recipes').delete().neq('id', crypto.randomUUID());
      await supabase.from('recipe_categories').delete().neq('id', crypto.randomUUID());
      await supabase.from('units').delete().neq('id', crypto.randomUUID());
      await supabase.from('persons').delete().neq('id', crypto.randomUUID());
      await supabase.from('archived_plans').delete().neq('id', crypto.randomUUID());
      
      // Import data
      if (data.recipeCategories && data.recipeCategories.length > 0) {
        const { error } = await supabase.from('recipe_categories').insert(data.recipeCategories.map(c => ({id: c.id, name: c.name, prefix: c.prefix})));
        if (error) throw new Error(`Błąd importu kategorii: ${error.message}`);
      }
      if (data.units && data.units.length > 0) {
        const { error } = await supabase.from('units').insert(data.units.map(u => ({id: u.id, name: u.name})));
        if (error) throw new Error(`Błąd importu jednostek: ${error.message}`);
      }
      if (data.persons && data.persons.length > 0) {
        const { error } = await supabase.from('persons').insert(data.persons.map(p => ({id: p.id, name: p.name})));
        if (error) throw new Error(`Błąd importu osób: ${error.message}`);
      }

      // Import recipes (core data first, then ingredients)
      if (data.recipes && data.recipes.length > 0) {
        const recipesToInsert = data.recipes.map(r => {
            const { db_ingredients, ...recipeCore } = r; // Exclude db_ingredients for the main recipe insert
            return recipeCore;
        });
        const { error: recipeError } = await supabase.from('recipes').insert(recipesToInsert);
        if (recipeError) throw new Error(`Błąd importu przepisów: ${recipeError.message}`);
      
        // Prepare and insert ingredients
        const allIngredientsToInsert: (RecipeDbIngredient & {recipe_id: string})[] = [];
        data.recipes.forEach(r => {
          if (r.db_ingredients && r.db_ingredients.length > 0) {
            r.db_ingredients.forEach(ing => {
              allIngredientsToInsert.push({ ...ing, recipe_id: r.id }); // Add recipe_id for linking
            });
          }
        });
        if (allIngredientsToInsert.length > 0) {
          const { error: ingError } = await supabase.from('ingredients').insert(allIngredientsToInsert);
          if (ingError) throw new Error(`Błąd importu składników: ${ingError.message}`);
        }
      }

      if (data.plannedMeals && data.plannedMeals.length > 0) {
        const { error } = await supabase.from('planned_meals').insert(data.plannedMeals);
        if (error) throw new Error(`Błąd importu zaplanowanych posiłków: ${error.message}`);
      }
      if (data.archivedPlans && data.archivedPlans.length > 0) {
        const { error } = await supabase.from('archived_plans').insert(data.archivedPlans);
        if (error) throw new Error(`Błąd importu zarchiwizowanych planów: ${error.message}`);
      }

      await loadInitialData(); // This will force refresh all data from DB and reset loading states
      alert("Dane zostały pomyślnie zaimportowane.");
      return true;

    } catch (e) {
      console.error("Error importing data:", e);
      alert(`Krytyczny błąd podczas importu danych: ${e instanceof Error ? e.message : String(e)}. Proces importu przerwany. Spróbuj odświeżyć aplikację.`);
      await loadInitialData(); // Attempt to reload current DB state on failure
      return false;
    } finally {
      // Ensure loading states are reset even if loadInitialData itself had an issue internally
      setIsLoadingCategories(false); setIsLoadingUnits(false); setIsLoadingPersons(false);
      setIsLoadingRecipes(false); setIsLoadingPlanner(false); setIsLoadingArchivedPlans(false);
    }
  };


  const contextValue: DataContextType = {
    recipes, recipeCategories, units, persons, weeklyPlan, archivedPlans,
    isLoadingRecipes, isLoadingPlanner, isLoadingCategories, isLoadingUnits, isLoadingPersons, isLoadingArchivedPlans, isArchivingPlan,
    errorRecipes, errorPlanner, errorCategories, errorUnits, errorPersons, errorArchivedPlans, errorArchivingPlan,
    addRecipe, updateRecipe, deleteRecipe, getRecipeById,
    getCategoryById, addRecipeCategory, updateRecipeCategory, deleteRecipeCategory,
    addPlannedMeal, updatePlannedMeal, deletePlannedMeal, clearWeeklyPlan,
    addUnit, deleteUnit,
    addPerson, updatePerson, deletePerson, getPersonById,
    refreshRecipes, refreshPlanner, refreshCategories, refreshUnits, refreshPersons, refreshArchivedPlans,
    getAllIngredientNames,
    archiveCurrentPlan, restorePlan, deleteArchivedPlan,
    exportAllData, importAllData,
    loadInitialData
  };

  return (
    <DataContext.Provider value={contextValue}>
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
