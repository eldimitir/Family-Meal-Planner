
import React, { useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PlannedMeal } from '../../types';

const PlannerPrintView: React.FC = () => {
  const { weeklyPlan, getRecipeById } = useData();

  useEffect(() => {
    // Automatically trigger print dialog when component mounts
    // Delay slightly to ensure content is rendered
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  const getMealName = (meal: PlannedMeal): string => {
    if (meal.customMealName) return meal.customMealName;
    if (meal.recipeId) {
      const recipe = getRecipeById(meal.recipeId);
      return recipe ? recipe.title : 'Przepis usunięty';
    }
    return 'Niezdefiniowany posiłek';
  };

  // Determine the maximum number of meal types planned in any single day for table structure
  const maxMealSlots = Math.max(...DAYS_OF_WEEK.map(day => {
    const meals = weeklyPlan[day] || [];
    const uniqueMealTypes = new Set(meals.map(m => m.mealType));
    return uniqueMealTypes.size;
  }), 0);

  const organizedPlan: Record<string, Record<string, PlannedMeal[]>> = {};
  DAYS_OF_WEEK.forEach(day => {
    organizedPlan[day] = {};
    MEAL_TYPES.forEach(mealType => {
      organizedPlan[day][mealType] = (weeklyPlan[day] || []).filter(m => m.mealType === mealType);
    });
  });


  return (
    <div className="print-container p-4 font-sans">
      <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">Tygodniowy Plan Posiłków</h1>
      
      <table className="w-full border-collapse border border-slate-400">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-300 p-2 text-left text-sm font-semibold text-slate-700">Dzień</th>
            {MEAL_TYPES.map(mealType => (
              <th key={mealType} className="border border-slate-300 p-2 text-left text-sm font-semibold text-slate-700">{mealType}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS_OF_WEEK.map(day => (
            <tr key={day} className="even:bg-slate-50">
              <td className="border border-slate-300 p-2 font-medium text-slate-600 align-top text-sm">{day}</td>
              {MEAL_TYPES.map(mealType => (
                <td key={mealType} className="border border-slate-300 p-2 align-top text-xs">
                  {organizedPlan[day][mealType]?.length > 0 ? (
                    organizedPlan[day][mealType].map(meal => (
                      <div key={meal.id} className="mb-1">
                        <p className="font-semibold text-sky-800">{getMealName(meal)}</p>
                        <p className="text-slate-500">({meal.servings} os.)</p>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
        Rodzinny Planer Posiłków - Plan na tydzień
      </footer>
    </div>
  );
};

export default PlannerPrintView;
    