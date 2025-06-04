import React, { useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PlannedMeal } from '../../types';

const PlannerPrintView: React.FC = () => {
  const { weeklyPlan, getRecipeById } = useData();

  useEffect(() => {
    // Check if there's actually anything to print
    const isEmptyPlan = Object.values(weeklyPlan).every(dayMeals => dayMeals.length === 0);
    if (!isEmptyPlan) {
        const timer = setTimeout(() => {
        window.print();
        }, 500); // Delay to allow content to render
        return () => clearTimeout(timer);
    }
  }, [weeklyPlan]);

  const getMealName = (meal: PlannedMeal): string => {
    if (meal.custom_meal_name) return meal.custom_meal_name;
    if (meal.recipe_id) {
      const recipe = getRecipeById(meal.recipe_id);
      return recipe ? recipe.title : 'Przepis usunięty';
    }
    return 'Niezdefiniowany posiłek';
  };

  const organizedPlan: Record<string, Record<string, PlannedMeal[]>> = {};
  DAYS_OF_WEEK.forEach(day => {
    organizedPlan[day] = {};
    MEAL_TYPES.forEach(mealType => {
      organizedPlan[day][mealType] = (weeklyPlan[day] || [])
        .filter(m => m.meal_type === mealType)
        .sort((a,b) => (getRecipeById(a.recipe_id || '')?.title || a.custom_meal_name || '').localeCompare(getRecipeById(b.recipe_id || '')?.title || b.custom_meal_name || ''));
    });
  });

  const isEmptyPlan = Object.values(weeklyPlan).every(dayMeals => dayMeals.length === 0);
  if (isEmptyPlan && typeof window !== 'undefined') { // Check window to avoid issues during server-side rendering or testing
     // Attempt to close the print preview if it was opened and there's nothing to print.
     // This is a bit of a hack, browser behavior might vary.
     // Or display a message. For now, let's rely on the preview page to not navigate here if empty.
     // Alternatively, this component could show a "nothing to print" message.
     return (
        <div className="print-container p-4 font-sans text-center">
             <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">Tygodniowy Plan Posiłków</h1>
            <p>Plan tygodniowy jest pusty. Nie ma nic do wydrukowania.</p>
             <button onClick={() => window.history.back()} className="mt-4 p-2 bg-slate-200 rounded">Wróć</button>
        </div>
     );
  }


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
              <td className="border border-slate-300 p-2 font-medium text-slate-600 align-top text-sm w-32">{day}</td>
              {MEAL_TYPES.map(mealType => (
                <td key={mealType} className="border border-slate-300 p-2 align-top text-xs">
                  {organizedPlan[day][mealType]?.length > 0 ? (
                     <ul className="list-none p-0 m-0 space-y-1">
                        {organizedPlan[day][mealType].map(meal => (
                        <li key={meal.id} className="mb-1">
                            <p className="font-semibold text-sky-800">{getMealName(meal)}</p>
                            {meal.persons && meal.persons.length > 0 && (
                            <p className="text-slate-500 text-xs">({meal.persons.join(', ')})</p>
                            )}
                        </li>
                        ))}
                    </ul>
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
        Rodzinny Planer Posiłków - Plan na tydzień ({new Date().toLocaleDateString()})
      </footer>
    </div>
  );
};

export default PlannerPrintView;
