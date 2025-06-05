import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PlannedMeal } from '../../types';
import Button from '../ui/Button';
import { PrintIcon } from '../../constants.tsx';

const PlannerPreviewPage: React.FC = () => {
  const { weeklyPlan, getRecipeById } = useData();
  const navigate = useNavigate();

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
      organizedPlan[day][mealType] = (weeklyPlan[day] || []).filter(m => m.meal_type === mealType)
        .sort((a,b) => (getRecipeById(a.recipe_id || '')?.title || a.custom_meal_name || '').localeCompare(getRecipeById(b.recipe_id || '')?.title || b.custom_meal_name || ''));
    });
  });
  
  const handlePrint = () => {
    navigate('/planer/drukuj');
  };

  const isEmptyPlan = Object.values(weeklyPlan).every(dayMeals => dayMeals.length === 0);

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-sky-700">Podgląd Planu Tygodniowego</h1>
        <Button onClick={handlePrint} variant="primary" leftIcon={<PrintIcon />} disabled={isEmptyPlan}>
          Drukuj Plan
        </Button>
      </div>

      {isEmptyPlan ? (
        <p className="text-center text-slate-500 py-10">Plan tygodniowy jest pusty.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-slate-300">
          <thead className="bg-slate-100">
            <tr className="text-left">
              <th className="border border-slate-300 p-2 text-sm font-semibold text-slate-700">Dzień</th>
              {MEAL_TYPES.map(mealType => (
                <th key={mealType} className="border border-slate-300 p-2 text-sm font-semibold text-slate-700">{mealType}</th>
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
                      <ul className="space-y-1">
                        {organizedPlan[day][mealType].map(meal => (
                          <li key={meal.id}>
                            <p className="font-semibold text-sky-800">{getMealName(meal)}</p>
                            {meal.persons_names && meal.persons_names.length > 0 && (
                              <p className="text-slate-500 text-xs">({meal.persons_names.join(', ')})</p>
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
      </div>
      )}
       <div className="mt-6 text-center">
            <Button onClick={() => navigate('/planer')} variant="secondary">
                Wróć do edycji planu
            </Button>
        </div>
    </div>
  );
};

export default PlannerPreviewPage;
