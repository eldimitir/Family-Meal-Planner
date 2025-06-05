
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

  errorRecipes: Error | null;
  errorPlanner: Error | null;
  errorCategories: Error | null;
  errorUnits: Error | null;
  errorPersons: Error | null;
  errorArchivedPlans: Error | null;
  
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
  importAllData: (data: FullExportData) => Promise<boolean>; // Returns true on success
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

  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);
  const [errorCategories, setErrorCategories] = useState<Error | null>(null);
  const [errorUnits, setErrorUnits] = useState<Error | null>(null);
  const [errorPersons, setErrorPersons] = useState<Error | null>(null);
  const [errorArchivedPlans, setErrorArchivedPlans] = useState<Error | null>(null);

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

  const getRecipeById = useCallback((recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  }, [recipes]);

  const getPersonById = useCallback((personId: string): Person | undefined => {
    return persons.find(p => p.id === personId);
  }, [persons]);

  const fetchRecipes = useCallback(async (currentCategories?: RecipeCategoryDB[], currentPersons?: Person[]) => {
    const categoriesToUse = currentCategories || recipeCategories;
    const personsToUse = currentPersons || persons;
    
    if (categoriesToUse.length === 0 && recipeCategories.length > 0 && !currentCategories) {
      // If currentCategories is not passed, but global recipeCategories exist,
      // it might indicate a refresh call before categories state is fully set from an initial fetch.
      // This might be too defensive or could be handled by ensuring `loadInitialData` sequence.
      // For now, let's proceed if categoriesToUse has items or if it's an initial call (no currentCategories).
    }
    if (personsToUse.length === 0 && persons.length > 0 && !currentPersons) {
      // Similar logic for persons.
    }

    setIsLoadingRecipes(true);
    setErrorRecipes(null);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients (*)')
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
    if (personsToUse.length === 0 && persons.length > 0 && !currentPersons ) {
       // similar to fetchRecipes
    }

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

  const fetchArchivedPlans = useCallback(async () => {
    setIsLoadingArchivedPlans(true);
    setErrorArchivedPlans(null);
    try {
        const { data, error } = await supabase
            .from('archived_plans')
            .select('*')
            .order('archived_at', { ascending: false });
        if (error) throw error;
        setArchivedPlans(data || []);
    } catch (e) {
        console.error("Error fetching archived plans:", e);
        setErrorArchivedPlans(e as Error);
        setArchivedPlans([]);
    } finally {
        setIsLoadingArchivedPlans(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
      setIsLoadingCategories(true);
      setIsLoadingPersons(true);
      setIsLoadingUnits(true);
      setIsLoadingRecipes(true);
      setIsLoadingPlanner(true);
      setIsLoadingArchivedPlans(true);

      const localCats = await fetchCategories(); 
      const localPers = await fetchPersons();   
      await fetchUnits();                     
      await fetchArchivedPlans();
      
      // Pass freshly fetched localCats and localPers
      await fetchRecipes(localCats, localPers); 
      await fetchPlanner(localPers);            
  // fetchRecipes and fetchPlanner are intentionally omitted from this dependency array.
  // This is because loadInitialData orchestrates the initial sequence and passes data
  // directly. Including them would cause a loop as their identities change
  // when fetchCategories/fetchPersons update their underlying state dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCategories, fetchUnits, fetchPersons, fetchArchivedPlans]);


  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
      setRecipes(prev => mapRecipeData([fullyMappedRecipe, ...prev.map(p => ({...p, ingredients: p.ingredients.map(i => ({...i}))}))], recipeCategories, persons).sort((a,b) => {
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
      await fetchPlanner(persons); 
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
      await fetchCategories().then(cats => fetchRecipes(cats, persons));
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
      await fetchCategories().then(cats => fetchRecipes(cats, persons));
      return data as RecipeCategoryDB;
    } catch (e) { console.error("Error updating recipe category:", e); setErrorCategories(e as Error); return null; }
  };

  const deleteRecipeCategory = async (categoryId: string) => {
    try {
      // This first updates recipes that use this category to set their category_id to null.
      const { error: updateRecipesError } = await supabase
        .from('recipes')
        .update({ category_id: null })
        .eq('category_id', categoryId);

      if (updateRecipesError) throw updateRecipesError;

      // Then, delete the category itself.
      const { error: deleteCategoryError } = await supabase.from('recipe_categories').delete().eq('id', categoryId);
      if (deleteCategoryError) throw deleteCategoryError;
      
      // Refresh local state
      await fetchCategories().then(async (newCats) => {
          await fetchRecipes(newCats, persons); // Recipes will be re-mapped with new category info
      });
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
      await fetchUnits();
      return data as Unit;
    } catch(e) { console.error("Error adding unit:", e); setErrorUnits(e as Error); return null; }
  };
  const deleteUnit = async (unitId: string) => {
    try {
        const { error } = await supabase.from('units').delete().eq('id', unitId);
        if (error) throw error;
        await fetchUnits();
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
        const { data: affectedRecipes, error: fetchRecipesError } = await supabase
            .from('recipes')
            .select('id, person_ids')
            .filter('person_ids', 'cs', `{${personIdToDelete}}`); 

        if (fetchRecipesError) throw fetchRecipesError;

        for (const recipe of affectedRecipes || []) {
            const updatedPersonIds = (recipe.person_ids || []).filter((id: string) => id !== personIdToDelete);
            const { error: updateRecipeError } = await supabase
                .from('recipes')
                .update({ person_ids: updatedPersonIds.length > 0 ? updatedPersonIds : null })
                .eq('id', recipe.id);
            if (updateRecipeError) throw updateRecipeError;
        }

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

        const { error: deletePersonError } = await supabase.from('persons').delete().eq('id', personIdToDelete);
        if (deletePersonError) throw deletePersonError;

        await fetchPersons().then(async (newPersons) => {
            await fetchRecipes(recipeCategories, newPersons); 
            await fetchPlanner(newPersons);
        });

    } catch (e) {
        console.error("Error deleting person and updating relations:", e);
        setErrorPersons(e as Error);
    }
  };

  const archiveCurrentPlan = async (name: string): Promise<ArchivedPlan | null> => {
    setIsLoadingArchivedPlans(true);
    setErrorArchivedPlans(null);
    try {
        const planToArchive: Record<DayOfWeek, ArchivedMealData[]> = {} as Record<DayOfWeek, ArchivedMealData[]>;
        for (const day of DAYS_OF_WEEK) {
            planToArchive[day] = (weeklyPlan[day] || []).map(meal => {
                const { id, created_at, persons_names, ...restOfMeal } = meal;
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
        await fetchArchivedPlans();
        return data as ArchivedPlan;
    } catch (e) {
        console.error("Error archiving plan:", e);
        setErrorArchivedPlans(e as Error);
        return null;
    } finally {
        setIsLoadingArchivedPlans(false);
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
                          console.warn(`Recipe ID ${validRecipeId} from archived plan not found. Meal "${archivedMeal.custom_meal_name || 'archived recipe'}" will be unlinked.`);
                          validRecipeId = null;
                      }
                      
                      let validPersonIds = archivedMeal.person_ids;
                      if (validPersonIds && validPersonIds.length > 0) {
                          validPersonIds = validPersonIds.filter(pId => !!getPersonById(pId));
                          if (validPersonIds.length === 0) validPersonIds = null;
                      }

                      const mealForDb: Omit<PlannedMeal, 'id' | 'created_at' | 'persons_names'> = {
                          day: day,
                          meal_type: archivedMeal.meal_type,
                          recipe_id: validRecipeId,
                          custom_meal_name: validRecipeId ? undefined : (archivedMeal.custom_meal_name || (getRecipeById(archivedMeal.recipe_id || '')?.title ? `Custom: ${getRecipeById(archivedMeal.recipe_id || '')?.title}` : "Archived Custom Meal")),
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

          await fetchPlanner(persons); 
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
    setIsLoadingArchivedPlans(true);
    setErrorArchivedPlans(null);
    try {
        const { error } = await supabase
            .from('archived_plans')
            .delete()
            .eq('id', planId);
        if (error) throw error;
        await fetchArchivedPlans();
        alert("Zarchiwizowany plan został usunięty.");
    } catch (e) {
        console.error("Error deleting archived plan:", e);
        setErrorArchivedPlans(e as Error);
        alert("Nie udało się usunąć zarchiwizowanego planu.");
    } finally {
        setIsLoadingArchivedPlans(false);
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
    setIsLoadingCategories(true); setIsLoadingUnits(true); setIsLoadingPersons(true);
    setIsLoadingRecipes(true); setIsLoadingPlanner(true); setIsLoadingArchivedPlans(true);
    try {
      const { data: catsData, error: catsError } = await supabase.from('recipe_categories').select('*');
      if (catsError) throw new Error(`Eksport kategorii: ${catsError.message}`);
      
      const { data: unitsData, error: unitsError } = await supabase.from('units').select('*');
      if (unitsError) throw new Error(`Eksport jednostek: ${unitsError.message}`);

      const { data: personsData, error: personsError } = await supabase.from('persons').select('*');
      if (personsError) throw new Error(`Eksport osób: ${personsError.message}`);
      
      const { data: recsRaw, error: recsError } = await supabase.from('recipes').select('*, ingredients(*)');
      if (recsError) throw new Error(`Eksport przepisów: ${recsError.message}`);

      const { data: plansRaw, error: plansError } = await supabase.from('planned_meals').select('*');
      if (plansError) throw new Error(`Eksport planów: ${plansError.message}`);

      const { data: archPlansRaw, error: archError } = await supabase.from('archived_plans').select('*');
      if (archError) throw new Error(`Eksport archiwów: ${archError.message}`);


      const recipesForExport: RecipeForExport[] = (recsRaw || []).map(r => {
        const { category_name, category_code_prefix, persons_names, ingredients, ...restOfRecipe } = r;
        return {
          ...restOfRecipe,
          db_ingredients: ingredients?.map((ing: any) => {
            const { id, recipe_id, ...restOfIng } = ing;
            return restOfIng;
          }) || []
        };
      });

      const plannedMealsForExport: PlannedMealForExport[] = (plansRaw || []).map(pm => {
        const { id, created_at, persons_names, ...restOfPm } = pm;
        return restOfPm;
      });
      
      const archivedPlansForExport: ArchivedPlanForExport[] = (archPlansRaw || []).map(ap => {
        const { id, archived_at, ...restOfAp } = ap;
        return restOfAp as ArchivedPlanForExport;
      });

      return {
        recipeCategories: catsData || [],
        units: unitsData || [],
        persons: personsData || [],
        recipes: recipesForExport,
        plannedMeals: plannedMealsForExport,
        archivedPlans: archivedPlansForExport,
      };
    } catch (e) {
      console.error("Error exporting data:", e);
      alert(`Błąd podczas eksportu danych: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      setIsLoadingCategories(false); setIsLoadingUnits(false); setIsLoadingPersons(false);
      setIsLoadingRecipes(false); setIsLoadingPlanner(false); setIsLoadingArchivedPlans(false);
    }
  };

  const importAllData = async (data: FullExportData): Promise<boolean> => {
    if (!window.confirm("Jesteś pewien, że chcesz zaimportować dane? WSZYSTKIE obecne dane (przepisy, plany, kategorie, osoby, jednostki, zarchiwizowane plany) zostaną USUNIĘTE i zastąpione danymi z pliku. Tej operacji NIE MOŻNA COFNĄĆ.")) {
      return false;
    }

    setIsLoadingCategories(true); setIsLoadingUnits(true); setIsLoadingPersons(true);
    setIsLoadingRecipes(true); setIsLoadingPlanner(true); setIsLoadingArchivedPlans(true);
    
    try {
      await supabase.from('ingredients').delete().neq('id', crypto.randomUUID());
      await supabase.from('planned_meals').delete().neq('id', crypto.randomUUID());
      await supabase.from('recipes').delete().neq('id', crypto.randomUUID());
      await supabase.from('recipe_categories').delete().neq('id', crypto.randomUUID());
      await supabase.from('units').delete().neq('id', crypto.randomUUID());
      await supabase.from('persons').delete().neq('id', crypto.randomUUID());
      await supabase.from('archived_plans').delete().neq('id', crypto.randomUUID());
      
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

      if (data.recipes && data.recipes.length > 0) {
        const recipesToInsert = data.recipes.map(r => {
            const { db_ingredients, ...recipeCore } = r;
            return recipeCore;
        });
        const { error: recipeError } = await supabase.from('recipes').insert(recipesToInsert);
        if (recipeError) throw new Error(`Błąd importu przepisów: ${recipeError.message}`);
      
        const allIngredientsToInsert: (RecipeDbIngredient & {recipe_id: string})[] = [];
        data.recipes.forEach(r => {
          if (r.db_ingredients && r.db_ingredients.length > 0) {
            r.db_ingredients.forEach(ing => {
              allIngredientsToInsert.push({ ...ing, recipe_id: r.id });
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

      await loadInitialData();
      alert("Dane zostały pomyślnie zaimportowane.");
      return true;

    } catch (e) {
      console.error("Error importing data:", e);
      alert(`Krytyczny błąd podczas importu danych: ${e instanceof Error ? e.message : String(e)}. Proces importu przerwany. Spróbuj odświeżyć aplikację.`);
      await loadInitialData(); 
      return false;
    } finally {
      setIsLoadingCategories(false); setIsLoadingUnits(false); setIsLoadingPersons(false);
      setIsLoadingRecipes(false); setIsLoadingPlanner(false); setIsLoadingArchivedPlans(false);
    }
  };

  const refreshRecipes = useCallback(() => fetchRecipes(recipeCategories, persons), [fetchRecipes, recipeCategories, persons]);
  const refreshPlanner = useCallback(() => fetchPlanner(persons), [fetchPlanner, persons]);
  const refreshCategories = useCallback(async () => { const cats = await fetchCategories(); await fetchRecipes(cats, persons); }, [fetchCategories, fetchRecipes, persons]);
  const refreshUnits = useCallback(() => fetchUnits(), [fetchUnits]);
  const refreshPersons = useCallback(async () => { const pers = await fetchPersons(); await fetchRecipes(recipeCategories, pers); await fetchPlanner(pers); }, [fetchPersons, recipeCategories, persons, fetchRecipes, fetchPlanner]);
  const refreshArchivedPlans = useCallback(() => fetchArchivedPlans(), [fetchArchivedPlans]);

  const contextValue: DataContextType = {
    recipes, recipeCategories, units, persons, weeklyPlan, archivedPlans,
    isLoadingRecipes, isLoadingPlanner, isLoadingCategories, isLoadingUnits, isLoadingPersons, isLoadingArchivedPlans,
    errorRecipes, errorPlanner, errorCategories, errorUnits, errorPersons, errorArchivedPlans,
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
