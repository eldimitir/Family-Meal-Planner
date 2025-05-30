import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Recipe, WeeklyPlan, PlannedMeal, Ingredient, RecipeCategory, DayOfWeek } from '../types';
import { GOOGLE_SHEETS_CONFIG, DAYS_OF_WEEK, RECIPE_COLUMNS, WEEKLY_PLAN_COLUMNS } from '../constants';
import { useGoogleSheetsApi } from './GoogleSheetsApiContext';

// Helper types for GAPI responses
interface ValueRange {
  range: string;
  majorDimension: string;
  values: any[][];
}

// Helper type for internal representation with rowIndex
interface RecipeWithRow extends Recipe {
  rowIndex: number; // 1-based index of the row in the sheet
}
interface PlannedMealWithRow extends PlannedMeal {
  rowIndex: number; // 1-based index of the row in the sheet
}


interface DataContextType {
  recipes: Recipe[];
  weeklyPlan: WeeklyPlan;
  isLoadingData: boolean;
  dataError: Error | null;
  isSavingData: boolean; // For add/update/delete operations

  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'rowIndex'>) => Promise<Recipe | null>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  
  addPlannedMeal: (plannedMeal: Omit<PlannedMeal, 'id'|'rowIndex'>) => Promise<PlannedMeal | null>;
  updatePlannedMeal: (plannedMeal: PlannedMeal) => Promise<void>;
  deletePlannedMeal: (plannedMealId: string, day: string) => Promise<void>;
  clearWeeklyPlan: () => Promise<void>;

  refreshData: () => Promise<void>; // To manually trigger a data refresh
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialWeeklyPlan: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = [];
  return acc;
}, {} as WeeklyPlan);

// Helper functions for data mapping
const mapRowToRecipe = (row: any[], rowIndex: number): RecipeWithRow => {
  return {
    id: row[RECIPE_COLUMNS.ID] || crypto.randomUUID(), // Assign UUID if ID is missing (e.g. empty row)
    title: row[RECIPE_COLUMNS.TITLE] || '',
    ingredients: JSON.parse(row[RECIPE_COLUMNS.INGREDIENTS] || '[]') as Ingredient[],
    instructions: row[RECIPE_COLUMNS.INSTRUCTIONS] || '',
    prepTime: row[RECIPE_COLUMNS.PREP_TIME] || '',
    category: (row[RECIPE_COLUMNS.CATEGORY] || RecipeCategory.INNE) as RecipeCategory,
    tags: JSON.parse(row[RECIPE_COLUMNS.TAGS] || '[]') as string[],
    createdAt: row[RECIPE_COLUMNS.CREATED_AT] || new Date().toISOString(),
    rowIndex,
  };
};

const mapRecipeToRow = (recipe: Recipe): any[] => {
  const row = [];
  row[RECIPE_COLUMNS.ID] = recipe.id;
  row[RECIPE_COLUMNS.TITLE] = recipe.title;
  row[RECIPE_COLUMNS.INGREDIENTS] = JSON.stringify(recipe.ingredients);
  row[RECIPE_COLUMNS.INSTRUCTIONS] = recipe.instructions;
  row[RECIPE_COLUMNS.PREP_TIME] = recipe.prepTime;
  row[RECIPE_COLUMNS.CATEGORY] = recipe.category;
  row[RECIPE_COLUMNS.TAGS] = JSON.stringify(recipe.tags);
  row[RECIPE_COLUMNS.CREATED_AT] = recipe.createdAt;
  return row;
};

const mapRowToPlannedMeal = (row: any[], rowIndex: number): PlannedMealWithRow => {
  return {
    id: row[WEEKLY_PLAN_COLUMNS.ID] || crypto.randomUUID(),
    day: (row[WEEKLY_PLAN_COLUMNS.DAY] || DAYS_OF_WEEK[0]) as DayOfWeek,
    mealType: row[WEEKLY_PLAN_COLUMNS.MEAL_TYPE] || '',
    recipeId: row[WEEKLY_PLAN_COLUMNS.RECIPE_ID] || null,
    customMealName: row[WEEKLY_PLAN_COLUMNS.CUSTOM_MEAL_NAME] || undefined,
    servings: parseInt(row[WEEKLY_PLAN_COLUMNS.SERVINGS] || '1', 10),
    rowIndex,
  };
};

const mapPlannedMealToRow = (plannedMeal: PlannedMeal): any[] => {
  const row = [];
  row[WEEKLY_PLAN_COLUMNS.ID] = plannedMeal.id;
  row[WEEKLY_PLAN_COLUMNS.DAY] = plannedMeal.day;
  row[WEEKLY_PLAN_COLUMNS.MEAL_TYPE] = plannedMeal.mealType;
  row[WEEKLY_PLAN_COLUMNS.RECIPE_ID] = plannedMeal.recipeId;
  row[WEEKLY_PLAN_COLUMNS.CUSTOM_MEAL_NAME] = plannedMeal.customMealName;
  row[WEEKLY_PLAN_COLUMNS.SERVINGS] = plannedMeal.servings;
  return row;
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { gapiClient, isGapiReady, gapiError: apiContextError } = useGoogleSheetsApi();
  
  const [recipes, setRecipes] = useState<RecipeWithRow[]>([]);
  const [plannedMeals, setPlannedMeals] = useState<PlannedMealWithRow[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<Error | null>(null);
  const [isSavingData, setIsSavingData] = useState<boolean>(false);

  const SPREADSHEET_ID = GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID;

  const fetchAllData = useCallback(async () => {
    if (!isGapiReady || !gapiClient) {
      if (apiContextError) setDataError(apiContextError);
      // Don't set isLoadingData to false if GAPI is not ready yet, context will handle that
      return;
    }
    setIsLoadingData(true);
    setDataError(null);
    try {
      const batchGetResponse = await gapiClient.sheets.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [GOOGLE_SHEETS_CONFIG.RECIPES_DATA_RANGE, GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_DATA_RANGE],
      });
      
      const recipeValues: ValueRange = batchGetResponse.result.valueRanges[0];
      const fetchedRecipes = recipeValues.values ? recipeValues.values.map((row, index) => mapRowToRecipe(row, index + 2)).filter(r => r.id && r.title) : [];
      setRecipes(fetchedRecipes);

      const planValues: ValueRange = batchGetResponse.result.valueRanges[1];
      const fetchedMeals = planValues.values ? planValues.values.map((row, index) => mapRowToPlannedMeal(row, index + 2)).filter(pm => pm.id && pm.day) : [];
      setPlannedMeals(fetchedMeals);

    } catch (error: any) {
      console.error("Error fetching data from Google Sheets:", error);
      setDataError(new Error(`Failed to fetch data: ${error.result?.error?.message || error.message}`));
    } finally {
      setIsLoadingData(false);
    }
  }, [gapiClient, isGapiReady, SPREADSHEET_ID, apiContextError]);

  useEffect(() => {
    if (isGapiReady && gapiClient) {
      fetchAllData();
    } else if (apiContextError) {
        setDataError(apiContextError);
        setIsLoadingData(false);
    }
    // If GAPI is not ready, we wait. The loading state is handled by GoogleSheetsApiContext initially.
  }, [isGapiReady, gapiClient, fetchAllData, apiContextError]);

  const refreshData = async () => {
    await fetchAllData();
  };

  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'rowIndex'>): Promise<Recipe | null> => {
    if (!gapiClient || !isGapiReady) {
      setDataError(new Error("Google Sheets API not ready."));
      return null;
    }
    setIsSavingData(true);
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    try {
      await gapiClient.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: GOOGLE_SHEETS_CONFIG.RECIPES_SHEET_NAME, // Append to the sheet, it will find the first empty row
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [mapRecipeToRow(newRecipe)],
        },
      });
      await fetchAllData(); // Refresh data to get rowIndex and ensure consistency
      setIsSavingData(false);
      return newRecipe; // Return the recipe without rowIndex, as it's internal
    } catch (error: any) {
      console.error("Error adding recipe:", error);
      setDataError(new Error(`Failed to add recipe: ${error.result?.error?.message || error.message}`));
      setIsSavingData(false);
      return null;
    }
  };
  
  const updateRecipe = async (updatedRecipe: Recipe) => {
    const recipeWithRow = recipes.find(r => r.id === updatedRecipe.id);
    if (!gapiClient || !isGapiReady || !recipeWithRow) {
      setDataError(new Error(!recipeWithRow ? "Recipe not found for update." : "Google Sheets API not ready."));
      return;
    }
    setIsSavingData(true);
    try {
      // Range for a single row, e.g., Recipes!A5:H5
      const range = `${GOOGLE_SHEETS_CONFIG.RECIPES_SHEET_NAME}!A${recipeWithRow.rowIndex}:H${recipeWithRow.rowIndex}`;
      await gapiClient.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [mapRecipeToRow(updatedRecipe)],
        },
      });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating recipe:", error);
      setDataError(new Error(`Failed to update recipe: ${error.result?.error?.message || error.message}`));
    } finally {
      setIsSavingData(false);
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    const recipeToDelete = recipes.find(r => r.id === recipeId);
    if (!gapiClient || !isGapiReady || !recipeToDelete) {
      setDataError(new Error(!recipeToDelete ? "Recipe not found for deletion." : "Google Sheets API not ready."));
      return;
    }
    setIsSavingData(true);
    try {
      // Deleting a row in sheets usually involves a batchUpdate to delete dimensions
      const requests = [{
        deleteDimension: {
          range: {
            sheetId: await getSheetIdByName(GOOGLE_SHEETS_CONFIG.RECIPES_SHEET_NAME), // Helper needed
            dimension: 'ROWS',
            startIndex: recipeToDelete.rowIndex - 1, // 0-indexed
            endIndex: recipeToDelete.rowIndex,
          },
        },
      }];

      // Also, find meals using this recipe and update them (set recipeId to null or handle as needed)
      const mealsToUpdate = plannedMeals.filter(meal => meal.recipeId === recipeId);
      for (const meal of mealsToUpdate) {
        const updatedMeal = { ...meal, recipeId: null, customMealName: meal.customMealName || `Usunięty przepis: ${recipeToDelete.title}`.substring(0,50) };
        // Add to batch update requests or do separately
        const mealRange = `${GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_SHEET_NAME}!A${meal.rowIndex}:F${meal.rowIndex}`;
        requests.push({
            updateCells: {
                rows: [{ values: [mapPlannedMealToRow(updatedMeal)].map(row => row.map(cell => ({ userEnteredValue: { stringValue: String(cell === null || cell === undefined ? "" : cell) }})))}],
                fields: '*', // Update all fields in the row
                range: {
                    sheetId: await getSheetIdByName(GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_SHEET_NAME),
                    startRowIndex: meal.rowIndex - 1,
                    endRowIndex: meal.rowIndex,
                    // Specify columns if needed, or update whole row if mapPlannedMealToRow provides all
                }
            }
        } as any); // GAPI types can be complex for batchUpdate
      }


      await gapiClient.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests },
      });
      await fetchAllData(); // Refresh all data
    } catch (error: any) {
      console.error("Error deleting recipe:", error);
      setDataError(new Error(`Failed to delete recipe: ${error.result?.error?.message || error.message}`));
    } finally {
      setIsSavingData(false);
    }
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };
  
  // Helper to get sheetId by name, as batchUpdate often needs sheetId (numeric)
  const getSheetIdByName = async (sheetName: string): Promise<number | null> => {
    if (!gapiClient || !isGapiReady) return null;
    try {
        const response = await gapiClient.sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets(properties(sheetId,title))'
        });
        const sheet = response.result.sheets.find((s:any) => s.properties.title === sheetName);
        return sheet ? sheet.properties.sheetId : null;
    } catch (error) {
        console.error("Error getting sheet ID by name:", error);
        return null;
    }
  };


  const addPlannedMeal = async (mealData: Omit<PlannedMeal, 'id' | 'rowIndex'>): Promise<PlannedMeal | null> => {
     if (!gapiClient || !isGapiReady) {
      setDataError(new Error("Google Sheets API not ready."));
      return null;
    }
    setIsSavingData(true);
    const newMeal: PlannedMeal = { ...mealData, id: crypto.randomUUID() };
    try {
      await gapiClient.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_SHEET_NAME,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [mapPlannedMealToRow(newMeal)],
        },
      });
      await fetchAllData();
      setIsSavingData(false);
      return newMeal;
    } catch (error: any) {
      console.error("Error adding planned meal:", error);
      setDataError(new Error(`Failed to add planned meal: ${error.result?.error?.message || error.message}`));
      setIsSavingData(false);
      return null;
    }
  };

  const updatePlannedMeal = async (updatedMeal: PlannedMeal) => {
    const mealWithRow = plannedMeals.find(m => m.id === updatedMeal.id);
    if (!gapiClient || !isGapiReady || !mealWithRow) {
      setDataError(new Error(!mealWithRow ? "Planned meal not found for update." : "Google Sheets API not ready."));
      return;
    }
    setIsSavingData(true);
    try {
      const range = `${GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_SHEET_NAME}!A${mealWithRow.rowIndex}:F${mealWithRow.rowIndex}`;
      await gapiClient.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [mapPlannedMealToRow(updatedMeal)],
        },
      });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating planned meal:", error);
      setDataError(new Error(`Failed to update planned meal: ${error.result?.error?.message || error.message}`));
    } finally {
      setIsSavingData(false);
    }
  };
  
  const deletePlannedMeal = async (plannedMealId: string, _day: string) => { // day param might not be needed if ID is unique
    const mealToDelete = plannedMeals.find(m => m.id === plannedMealId);
    if (!gapiClient || !isGapiReady || !mealToDelete) {
      setDataError(new Error(!mealToDelete ? "Planned meal not found for deletion." : "Google Sheets API not ready."));
      return;
    }
    setIsSavingData(true);
    try {
      const sheetId = await getSheetIdByName(GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_SHEET_NAME);
      if (sheetId === null) throw new Error("Could not find sheet ID for WeeklyPlan");

      await gapiClient.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: mealToDelete.rowIndex - 1, // 0-indexed
                endIndex: mealToDelete.rowIndex,
              },
            },
          }],
        },
      });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting planned meal:", error);
      setDataError(new Error(`Failed to delete planned meal: ${error.result?.error?.message || error.message}`));
    } finally {
      setIsSavingData(false);
    }
  };
  
  const clearWeeklyPlan = async () => {
    if (!gapiClient || !isGapiReady) {
      setDataError(new Error("Google Sheets API not ready."));
      return;
    }
    setIsSavingData(true);
    try {
        // Clear all data rows, keeping header. Range A2:F clears all data if data starts at row 2.
        await gapiClient.sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: GOOGLE_SHEETS_CONFIG.WEEKLY_PLAN_DATA_RANGE, 
        });
        await fetchAllData(); // Refresh
    } catch (error: any) {
        console.error("Error clearing weekly plan:", error);
        setDataError(new Error(`Failed to clear weekly plan: ${error.result?.error?.message || error.message}`));
    } finally {
        setIsSavingData(false);
    }
  };

  const weeklyPlanForUI: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = plannedMeals.filter(meal => meal.day === day);
    return acc;
  }, {} as WeeklyPlan);


  return (
    <DataContext.Provider value={{ 
        recipes: recipes.map(({rowIndex, ...rest}) => rest), // Strip rowIndex for external use
        weeklyPlan: weeklyPlanForUI, 
        isLoadingData, 
        dataError,
        isSavingData,
        addRecipe, updateRecipe, deleteRecipe, getRecipeById,
        addPlannedMeal, updatePlannedMeal, deletePlannedMeal, clearWeeklyPlan,
        refreshData
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
