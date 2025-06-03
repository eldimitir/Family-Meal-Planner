import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, DayOfWeek, AISuggestedRecipe, RecipeCategory } from '../types';
import { 
  DAYS_OF_WEEK, 
  GEMINI_MODEL_NAME,
  NOCODB_BASE_URL,
  NOCODB_API_TOKEN,
  NOCODB_PROJECT_ID,
  NOCODB_RECIPES_TABLE,
  NOCODB_INGREDIENTS_TABLE,
  NOCODB_PLANNED_MEALS_TABLE
} from '../constants';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

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
  getAIRecipeSuggestion: (userPrompt: string) => Promise<AISuggestedRecipe | null>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialWeeklyPlan: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = [];
  return acc;
}, {} as WeeklyPlan);


// NocoDB API Helper
const nocoDBRequest = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  tableName: string,
  params?: Record<string, any>,
  body?: any,
  recordId?: string | number
): Promise<any> => {
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN || !NOCODB_PROJECT_ID) {
    throw new Error("NocoDB configuration (URL, Token, or Project ID) is missing in environment variables.");
  }

  let url = `${NOCODB_BASE_URL}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/${tableName}`;
  if (recordId) {
    url += `/${recordId}`;
  }

  if (params && Object.keys(params).length > 0) {
    const queryParams = new URLSearchParams(params).toString();
    url += `?${queryParams}`;
  }

  const headers: HeadersInit = {
    'xc-token': NOCODB_API_TOKEN,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error(`NocoDB API Error (${response.status}) on ${tableName}:`, errorData);
    throw new Error(`NocoDB: ${errorData.message || response.statusText} (Status: ${response.status})`);
  }
  
  // NocoDB DELETE often returns 200/204 with count or simple success, not always JSON
  if (method === 'DELETE') {
    if (response.status === 204 || response.status === 200) { // 200 if it returns a count
      try {
        return await response.json(); // if there's a body like { count: 1 }
      } catch (e) {
        return { success: true }; // if no body or not json
      }
    }
  }

  return response.json();
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(initialWeeklyPlan);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState<boolean>(true);
  const [errorRecipes, setErrorRecipes] = useState<Error | null>(null);
  const [errorPlanner, setErrorPlanner] = useState<Error | null>(null);
  const [isNocoDBConfigured, setIsNocoDBConfigured] = useState<boolean>(false);

  useEffect(() => {
    if (NOCODB_BASE_URL && NOCODB_API_TOKEN && NOCODB_PROJECT_ID) {
      setIsNocoDBConfigured(true);
    } else {
      const errMsg = "NocoDB nie jest skonfigurowany. Sprawdź zmienne środowiskowe NOCODB_BASE_URL, NOCODB_API_TOKEN, NOCODB_PROJECT_ID. Funkcje zapisu i odczytu danych są wyłączone.";
      console.error(errMsg);
      setErrorRecipes(new Error(errMsg));
      setErrorPlanner(new Error(errMsg));
      setIsLoadingRecipes(false);
      setIsLoadingPlanner(false);
    }
  }, []);

  // Helper to map NocoDB record to our types (Id -> id, CreatedAt -> created_at, etc.)
  const mapNocoRecord = (nocoRecord: any): any => {
    const mapped: any = {};
    for (const key in nocoRecord) {
      if (key === 'Id') mapped['id'] = nocoRecord[key]?.toString(); // Ensure ID is string
      else if (key === 'CreatedAt') mapped['created_at'] = nocoRecord[key];
      else if (key === 'UpdatedAt') mapped['updated_at'] = nocoRecord[key];
      // Assuming NocoDB column names match our type field names (e.g. title, instructions, recipe_id)
      // For keys like 'RecipeId' in NocoDB, ensure they map to 'recipe_id' in our types
      // This simple mapping assumes direct match or NocoDB column names are already like 'recipe_id'
      else {
         // Convert keys like 'RecipeId' from NocoDB to 'recipe_id'
        const newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        if (key.toLowerCase() === 'recipeid' || key.toLowerCase() === 'recipe_id') {
            mapped['recipe_id'] = nocoRecord[key]?.toString();
        } else {
            mapped[key.charAt(0).toLowerCase() + key.slice(1)] = nocoRecord[key];
        }
      }
    }
    return mapped;
  };
  
    const mapNocoRecipe = (nocoRecipe: any, ingredients: Ingredient[]): Recipe => {
    return {
      id: nocoRecipe.Id?.toString(),
      title: nocoRecipe.title,
      instructions: nocoRecipe.instructions,
      prep_time: nocoRecipe.prep_time,
      category: nocoRecipe.category as RecipeCategory,
      tags: Array.isArray(nocoRecipe.tags) ? nocoRecipe.tags : (typeof nocoRecipe.tags === 'string' ? JSON.parse(nocoRecipe.tags || "[]") : []),
      created_at: nocoRecipe.CreatedAt || nocoRecipe.created_at,
      ingredients: ingredients,
    };
  };

  const mapNocoIngredient = (nocoIngredient: any): Ingredient => {
    return {
      id: nocoIngredient.Id?.toString(),
      recipe_id: nocoIngredient.recipe_id?.toString(),
      name: nocoIngredient.name,
      quantity: nocoIngredient.quantity,
      unit: nocoIngredient.unit,
    };
  };

  const mapNocoPlannedMeal = (nocoPlannedMeal: any): PlannedMeal => {
    return {
      id: nocoPlannedMeal.Id?.toString(),
      day: nocoPlannedMeal.day,
      meal_type: nocoPlannedMeal.meal_type,
      recipe_id: nocoPlannedMeal.recipe_id?.toString() || null,
      custom_meal_name: nocoPlannedMeal.custom_meal_name,
      servings: nocoPlannedMeal.servings,
      created_at: nocoPlannedMeal.CreatedAt || nocoPlannedMeal.created_at,
    };
  };


  const fetchRecipes = useCallback(async () => {
    if (!isNocoDBConfigured) return;
    setIsLoadingRecipes(true);
    setErrorRecipes(null);
    try {
      let nocoRecipes = await nocoDBRequest('GET', NOCODB_RECIPES_TABLE, { limit: 1000, offset: 0 }); // Adjust limit as needed
      if (nocoRecipes && nocoRecipes.list) nocoRecipes = nocoRecipes.list; // NocoDB wraps in 'list'

      const recipesWithIngredients: Recipe[] = [];
      for (const nocoRec of nocoRecipes) {
        // NocoDB's where filter format: (column,op,value)
        let nocoIngredients = await nocoDBRequest('GET', NOCODB_INGREDIENTS_TABLE, { where: `(recipe_id,eq,${nocoRec.Id})`, limit: 1000 });
        if (nocoIngredients && nocoIngredients.list) nocoIngredients = nocoIngredients.list;
        
        const mappedIngredients = nocoIngredients.map(mapNocoIngredient);
        recipesWithIngredients.push(mapNocoRecipe(nocoRec, mappedIngredients));
      }
      setRecipes(recipesWithIngredients);
    } catch (e: any) {
      console.error("Error fetching recipes from NocoDB:", e);
      setErrorRecipes(e);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [isNocoDBConfigured]);

  const fetchPlanner = useCallback(async () => {
    if (!isNocoDBConfigured) return;
    setIsLoadingPlanner(true);
    setErrorPlanner(null);
    try {
      let nocoPlannedMeals = await nocoDBRequest('GET', NOCODB_PLANNED_MEALS_TABLE, { limit: 1000, offset: 0 });
      if (nocoPlannedMeals && nocoPlannedMeals.list) nocoPlannedMeals = nocoPlannedMeals.list;

      const newWeeklyPlan = { ...initialWeeklyPlan };
      nocoPlannedMeals.forEach((nocoMeal: any) => {
        const meal = mapNocoPlannedMeal(nocoMeal);
        if (newWeeklyPlan[meal.day]) {
          newWeeklyPlan[meal.day].push(meal);
        } else {
          newWeeklyPlan[meal.day] = [meal];
        }
      });
      setWeeklyPlan(newWeeklyPlan);
    } catch (e: any) {
      console.error("Error fetching planner data from NocoDB:", e);
      setErrorPlanner(e);
    } finally {
      setIsLoadingPlanner(false);
    }
  }, [isNocoDBConfigured]);

  useEffect(() => {
    if (isNocoDBConfigured) {
      fetchRecipes();
      fetchPlanner();
    }
  }, [isNocoDBConfigured, fetchRecipes, fetchPlanner]);

  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return null; }
    try {
      const recipePayload = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category: recipeData.category,
        tags: recipeData.tags, // NocoDB JSON column should handle arrays directly; if Text, use JSON.stringify
      };
      const newNocoRecipe = await nocoDBRequest('POST', NOCODB_RECIPES_TABLE, undefined, recipePayload);
      const newRecipeId = newNocoRecipe.Id;

      const createdIngredients: Ingredient[] = [];
      for (const ing of recipeData.ingredients) {
        const ingredientPayload = { ...ing, recipe_id: newRecipeId };
        const newNocoIngredient = await nocoDBRequest('POST', NOCODB_INGREDIENTS_TABLE, undefined, ingredientPayload);
        createdIngredients.push(mapNocoIngredient(newNocoIngredient));
      }
      
      await fetchRecipes(); // Refresh the entire list
      return mapNocoRecipe(newNocoRecipe, createdIngredients);
    } catch (e: any) {
      console.error("Error adding recipe to NocoDB:", e);
      alert(`Błąd podczas dodawania przepisu: ${e.message}`);
      return null;
    }
  };

  const updateRecipe = async (recipeData: Omit<Recipe, 'created_at'|'ingredients'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] }): Promise<Recipe | null> => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return null; }
    try {
      const recipePayload = {
        title: recipeData.title,
        instructions: recipeData.instructions,
        prep_time: recipeData.prep_time,
        category: recipeData.category,
        tags: recipeData.tags,
      };
      const updatedNocoRecipe = await nocoDBRequest('PATCH', NOCODB_RECIPES_TABLE, undefined, recipePayload, recipeData.id);

      // Delete old ingredients: Fetch IDs first, then delete one by one or bulk if NocoDB supports it better
      let oldIngredients = await nocoDBRequest('GET', NOCODB_INGREDIENTS_TABLE, { where: `(recipe_id,eq,${recipeData.id})`, fields: 'Id', limit: 1000 });
      if (oldIngredients && oldIngredients.list) oldIngredients = oldIngredients.list;

      for (const oldIng of oldIngredients) {
        await nocoDBRequest('DELETE', NOCODB_INGREDIENTS_TABLE, undefined, undefined, oldIng.Id);
      }
      
      // Add new ingredients
      const updatedIngredients: Ingredient[] = [];
      for (const ing of recipeData.ingredients) {
        const ingredientPayload = { ...ing, recipe_id: recipeData.id };
        const newNocoIngredient = await nocoDBRequest('POST', NOCODB_INGREDIENTS_TABLE, undefined, ingredientPayload);
        updatedIngredients.push(mapNocoIngredient(newNocoIngredient));
      }
      
      await fetchRecipes();
      return mapNocoRecipe(updatedNocoRecipe, updatedIngredients);
    } catch (e: any) {
      console.error("Error updating recipe in NocoDB:", e);
      alert(`Błąd podczas aktualizacji przepisu: ${e.message}`);
      return null;
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return; }
    try {
      // Delete ingredients first
       let ingredientsToDelete = await nocoDBRequest('GET', NOCODB_INGREDIENTS_TABLE, { where: `(recipe_id,eq,${recipeId})`, fields: 'Id', limit: 1000 });
      if (ingredientsToDelete && ingredientsToDelete.list) ingredientsToDelete = ingredientsToDelete.list;
      for (const ing of ingredientsToDelete) {
        await nocoDBRequest('DELETE', NOCODB_INGREDIENTS_TABLE, undefined, undefined, ing.Id);
      }
      // Then delete recipe
      await nocoDBRequest('DELETE', NOCODB_RECIPES_TABLE, undefined, undefined, recipeId);
      await fetchRecipes();
    } catch (e: any) {
      console.error("Error deleting recipe from NocoDB:", e);
      alert(`Błąd podczas usuwania przepisu: ${e.message}`);
    }
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };

  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'created_at'>): Promise<PlannedMeal | null> => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return null; }
    try {
      const newNocoMeal = await nocoDBRequest('POST', NOCODB_PLANNED_MEALS_TABLE, undefined, mealData);
      await fetchPlanner();
      return mapNocoPlannedMeal(newNocoMeal);
    } catch (e: any) {
      console.error("Error adding planned meal to NocoDB:", e);
      alert(`Błąd podczas dodawania planowanego posiłku: ${e.message}`);
      return null;
    }
  };

  const updatePlannedMeal = async (mealData: Omit<PlannedMeal, 'created_at'>): Promise<PlannedMeal | null> => {
     if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return null; }
    try {
      const { id, ...payload } = mealData; // Separate id for recordId param
      const updatedNocoMeal = await nocoDBRequest('PATCH', NOCODB_PLANNED_MEALS_TABLE, undefined, payload, id);
      await fetchPlanner();
      return mapNocoPlannedMeal(updatedNocoMeal);
    } catch (e: any) {
      console.error("Error updating planned meal in NocoDB:", e);
      alert(`Błąd podczas aktualizacji planowanego posiłku: ${e.message}`);
      return null;
    }
  };

  const deletePlannedMeal = async (plannedMealId: string) => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return; }
    try {
      await nocoDBRequest('DELETE', NOCODB_PLANNED_MEALS_TABLE, undefined, undefined, plannedMealId);
      await fetchPlanner();
    } catch (e: any) {
      console.error("Error deleting planned meal from NocoDB:", e);
      alert(`Błąd podczas usuwania planowanego posiłku: ${e.message}`);
    }
  };

  const clearWeeklyPlan = async () => {
    if (!isNocoDBConfigured) { alert("NocoDB nie jest skonfigurowany."); return; }
    try {
      // Fetch all meal IDs then delete. NocoDB might not have a simple "delete all" by table via basic REST.
      let mealsToClear = await nocoDBRequest('GET', NOCODB_PLANNED_MEALS_TABLE, { fields: 'Id', limit: 10000 }); // High limit
      if (mealsToClear && mealsToClear.list) mealsToClear = mealsToClear.list;
      for (const meal of mealsToClear) {
        await nocoDBRequest('DELETE', NOCODB_PLANNED_MEALS_TABLE, undefined, undefined, meal.Id);
      }
      await fetchPlanner(); // This will set the plan to initialWeeklyPlan if empty
    } catch (e: any) {
       console.error("Error clearing weekly plan from NocoDB:", e);
       alert(`Błąd podczas czyszczenia planu tygodniowego: ${e.message}`);
    }
  };

  const getAIRecipeSuggestion = async (userPrompt: string): Promise<AISuggestedRecipe | null> => {
    // This function remains the same, using Gemini API
    if (!process.env.API_KEY) {
      console.error("API_KEY is not set. Cannot call Gemini API.");
      throw new Error("Klucz API nie jest skonfigurowany. Funkcja AI jest niedostępna.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const availableCategories = Object.values(RecipeCategory).join(', ');
    const instructionPrompt = `
      Na podstawie poniższego opisu użytkownika: '${userPrompt}', wygeneruj sugestię przepisu.
      Przepis powinien zawierać tytuł, listę składników (każdy z nazwą, ilością i jednostką), instrukcje przygotowania krok po kroku, czas przygotowania (np. "30 minut"), kategorię (wybierz jedną z: ${availableCategories}) oraz listę odpowiednich tagów (np. "szybkie", "zdrowe", "wegetariańskie").
      Zwróć odpowiedź jako pojedynczy obiekt JSON o następującej strukturze:
      {
        "title": "string",
        "ingredients": [{ "name": "string", "quantity": "string", "unit": "string" }],
        "instructions": "string (kroki oddzielone znakiem nowej linii '\\n')",
        "prep_time": "string",
        "category": "string (musi być jedną z podanych kategorii)",
        "tags": ["string"]
      }
      Nie dołączaj żadnego tekstu wyjaśniającego przed ani po obiekcie JSON. Upewnij się, że JSON jest poprawny.
    `;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: instructionPrompt,
        config: { responseMimeType: "application/json" }
      });
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) { jsonStr = match[2].trim(); }
      const parsedData = JSON.parse(jsonStr);
      if (!Object.values(RecipeCategory).includes(parsedData.category as RecipeCategory)) {
        console.warn(`AI zwróciło nieprawidłową kategorię: ${parsedData.category}. Ustawiono domyślną: ${RecipeCategory.INNE}.`);
        parsedData.category = RecipeCategory.INNE;
      }
      if (!parsedData.title || !parsedData.ingredients || !parsedData.instructions || !parsedData.prep_time || !parsedData.tags) {
          throw new Error("AI zwróciło niekompletne dane przepisu.");
      }
      if (!Array.isArray(parsedData.ingredients) || !Array.isArray(parsedData.tags)) {
          throw new Error("Pola 'ingredients' i 'tags' muszą być tablicami.");
      }
      parsedData.ingredients.forEach((ing: any) => {
          if (typeof ing.name !== 'string' || typeof ing.quantity !== 'string' || typeof ing.unit !== 'string') {
              throw new Error("Każdy składnik musi zawierać 'name', 'quantity' i 'unit' jako stringi.");
          }
      });
      return parsedData as AISuggestedRecipe;
    } catch (error) {
      console.error("Błąd podczas pobierania sugestii przepisu od AI:", error);
      if (error instanceof Error) { throw new Error(`Nie udało się uzyskać sugestii od AI: ${error.message}`); }
      throw new Error("Nie udało się uzyskać sugestii od AI. Spróbuj ponownie.");
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
      getAIRecipeSuggestion,
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
