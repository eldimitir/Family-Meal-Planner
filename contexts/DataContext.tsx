
import React, { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Recipe, WeeklyPlan, PlannedMeal } from '../types';
import { LOCAL_STORAGE_KEYS, DAYS_OF_WEEK } from '../constants';

interface DataContextType {
  recipes: Recipe[];
  setRecipes: (value: Recipe[] | ((val: Recipe[]) => Recipe[])) => void;
  weeklyPlan: WeeklyPlan;
  setWeeklyPlan: (value: WeeklyPlan | ((val: WeeklyPlan) => WeeklyPlan)) => void;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Recipe;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;
  getRecipeById: (recipeId: string) => Recipe | undefined;
  addPlannedMeal: (plannedMeal: Omit<PlannedMeal, 'id'>) => void;
  updatePlannedMeal: (plannedMeal: PlannedMeal) => void;
  deletePlannedMeal: (plannedMealId: string, day: string) => void;
  clearWeeklyPlan: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialWeeklyPlan: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = [];
  return acc;
}, {} as WeeklyPlan);


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>(LOCAL_STORAGE_KEYS.RECIPES, []);
  const [weeklyPlan, setWeeklyPlan] = useLocalStorage<WeeklyPlan>(LOCAL_STORAGE_KEYS.WEEKLY_PLAN, initialWeeklyPlan);

  const addRecipe = (recipeData: Omit<Recipe, 'id' | 'createdAt'>): Recipe => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setRecipes(prevRecipes => [...prevRecipes, newRecipe]);
    return newRecipe;
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(prevRecipes =>
      prevRecipes.map(recipe => (recipe.id === updatedRecipe.id ? updatedRecipe : recipe))
    );
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
    // Also remove from weekly plan
    setWeeklyPlan(prevPlan => {
      const newPlan = { ...prevPlan };
      for (const day in newPlan) {
        newPlan[day] = newPlan[day].filter(meal => meal.recipeId !== recipeId);
      }
      return newPlan;
    });
  };
  
  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };

  const addPlannedMeal = (mealData: Omit<PlannedMeal, 'id'>) => {
    const newMeal: PlannedMeal = { ...mealData, id: crypto.randomUUID() };
    setWeeklyPlan(prevPlan => {
      const dayMeals = prevPlan[newMeal.day] ? [...prevPlan[newMeal.day], newMeal] : [newMeal];
      return { ...prevPlan, [newMeal.day]: dayMeals };
    });
  };

  const updatePlannedMeal = (updatedMeal: PlannedMeal) => {
    setWeeklyPlan(prevPlan => {
      const dayMeals = (prevPlan[updatedMeal.day] || []).map(meal =>
        meal.id === updatedMeal.id ? updatedMeal : meal
      );
      return { ...prevPlan, [updatedMeal.day]: dayMeals };
    });
  };

  const deletePlannedMeal = (plannedMealId: string, day: string) => {
    setWeeklyPlan(prevPlan => {
      const dayMeals = (prevPlan[day] || []).filter(meal => meal.id !== plannedMealId);
      return { ...prevPlan, [day]: dayMeals };
    });
  };
  
  const clearWeeklyPlan = () => {
    setWeeklyPlan(initialWeeklyPlan);
  };

  return (
    <DataContext.Provider value={{ 
        recipes, setRecipes, 
        weeklyPlan, setWeeklyPlan,
        addRecipe, updateRecipe, deleteRecipe, getRecipeById,
        addPlannedMeal, updatePlannedMeal, deletePlannedMeal, clearWeeklyPlan
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
    