import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal, Recipe, WeeklyCalorieTableSummary, PersonDailyCalorieSummary } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Button from '../ui/Button';
import { DAYS_OF_WEEK } from '../../constants';
import { PrintIcon, TrashIcon, EyeIcon } from '../../constants.tsx'; // EyeIcon for "Show Plan"

const MealPlannerDashboard: React.FC = () => {
  const { weeklyPlan, clearWeeklyPlan, getRecipeById, recipes: allRecipes } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [mealToEdit, setMealToEdit] = useState<PlannedMeal | undefined>(undefined);
  const navigate = useNavigate();

  const handleAddMeal = (day: DayOfWeek) => {
    setSelectedDay(day);
    setMealToEdit(undefined);
    setIsModalOpen(true);
  };

  const handleEditMeal = (meal: PlannedMeal) => {
    setSelectedDay(meal.day as DayOfWeek);
    setMealToEdit(meal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setMealToEdit(undefined);
  };

  const handleShowPlan = () => {
    navigate('/planer/podglad'); // Navigate to new preview page
  };

  const handleClearPlan = () => {
    if (window.confirm("Czy na pewno chcesz wyczyścić cały plan tygodniowy? Tej operacji nie można cofnąć.")) {
      clearWeeklyPlan();
    }
  };

  const weeklyCalorieSummaryTable = useMemo((): WeeklyCalorieTableSummary => {
    const summary: WeeklyCalorieTableSummary = {
      persons: {},
      dailyTotals: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), {} as Record<DayOfWeek, number>),
      grandTotal: 0,
    };

    const allPlannedMeals = Object.values(weeklyPlan).flat();
    const uniquePersonsInPlan = new Set<string>();

    allPlannedMeals.forEach(pm => {
      if (pm.recipe_id) {
        const recipe = getRecipeById(pm.recipe_id);
        if (recipe && recipe.persons) {
          recipe.persons.forEach(person => uniquePersonsInPlan.add(person));
        }
      }
       // Also consider persons directly assigned to meals if they are not in any recipe persons list
      if (pm.persons) {
        pm.persons.forEach(p => uniquePersonsInPlan.add(p));
      }
    });
    
    // If no persons are defined anywhere but there are recipes with calories, sum under "Ogólne"
    if (uniquePersonsInPlan.size === 0 && allPlannedMeals.some(pm => pm.recipe_id && getRecipeById(pm.recipe_id)?.calories)) {
        const generalPersonName = "Ogółem (brak przypisanych osób)";
        summary.persons[generalPersonName] = DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0, total: 0 }), { total: 0 } as PersonDailyCalorieSummary);
        
        DAYS_OF_WEEK.forEach(day => {
            let dayCalories = 0;
            weeklyPlan[day]?.forEach(pm => {
                if (pm.recipe_id) {
                    const recipe = getRecipeById(pm.recipe_id);
                    if (recipe?.calories) {
                        dayCalories += recipe.calories;
                    }
                }
            });
            summary.persons[generalPersonName][day] = dayCalories;
            summary.persons[generalPersonName].total += dayCalories;
            summary.dailyTotals[day] += dayCalories;
            summary.grandTotal += dayCalories;
        });
    } else {
        uniquePersonsInPlan.forEach(personName => {
          summary.persons[personName] = DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), { total: 0 } as PersonDailyCalorieSummary);
        });

        DAYS_OF_WEEK.forEach(day => {
          weeklyPlan[day]?.forEach(pm => {
            if (pm.recipe_id) {
              const recipe = getRecipeById(pm.recipe_id);
              if (recipe?.calories) {
                if (pm.persons && pm.persons.length > 0) { // Meal assigned to specific persons
                  pm.persons.forEach(personName => {
                    if (summary.persons[personName]) { // Ensure person exists in summary
                      summary.persons[personName][day] = (summary.persons[personName][day] || 0) + recipe.calories;
                      summary.persons[personName].total += recipe.calories;
                      summary.dailyTotals[day] += recipe.calories; // This might double count if meal assigned to multiple people and we sum daily totals simply
                                                                // Let's adjust dailyTotals and grandTotal to sum from person totals to avoid double counting
                    }
                  });
                } else { // Meal not assigned to specific persons, add to all unique persons in the plan context
                  uniquePersonsInPlan.forEach(personName => {
                     if (summary.persons[personName]) {
                        summary.persons[personName][day] = (summary.persons[personName][day] || 0) + recipe.calories;
                        summary.persons[personName].total += recipe.calories;
                     }
                  });
                }
              }
            }
          });
        });
        
        // Recalculate dailyTotals and grandTotal from person totals to avoid double counting
        // when a meal (not assigned to specific person) contributes to multiple people.
        // Or, more accurately, a meal's calories should only be added ONCE to daily/grand totals.
        // The logic for "dolicz do wszystkich" is for individual person's summary, not the overall sum.

        // Reset daily and grand totals
        summary.dailyTotals = DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), {} as Record<DayOfWeek, number>);
        summary.grandTotal = 0;

        allPlannedMeals.forEach(pm => {
            if (pm.recipe_id) {
                const recipe = getRecipeById(pm.recipe_id);
                if (recipe?.calories) {
                    summary.dailyTotals[pm.day as DayOfWeek] += recipe.calories;
                    summary.grandTotal += recipe.calories;
                }
            }
        });
    }
    return summary;
  }, [weeklyPlan, getRecipeById, allRecipes]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Planer Posiłków</h1>
        <div className="flex gap-2 flex-wrap">
            <Button onClick={handleClearPlan} variant="danger" size="sm" leftIcon={<TrashIcon />}>
                Wyczyść Plan
            </Button>
            <Button onClick={handleShowPlan} variant="primary" size="sm" leftIcon={<EyeIcon />}>
                Pokaż Plan Tygodnia
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map(day => (
          <DayColumn
            key={day}
            day={day}
            meals={weeklyPlan[day] || []}
            onAddMeal={handleAddMeal}
            onEditMeal={handleEditMeal}
          />
        ))}
      </div>

      {selectedDay && (
        <AddMealModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          day={selectedDay}
          mealToEdit={mealToEdit}
        />
      )}
      
      <div className="mt-8 p-4 sm:p-6 bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Podsumowanie Kaloryczności Tygodnia (kcal)</h2>
        {Object.keys(weeklyCalorieSummaryTable.persons).length === 0 && Object.values(weeklyPlan).flat().length > 0 && (
           <p className="text-slate-500">Brak danych o kaloryczności w zaplanowanych przepisach lub brak przypisanych osób.</p>
        )}
        {Object.values(weeklyPlan).flat().length === 0 && (
          <p className="text-slate-500">Brak zaplanowanych posiłków w tym tygodniu.</p>
        )}

        {Object.keys(weeklyCalorieSummaryTable.persons).length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Osoba</th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day} className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{day.substring(0,3)}</th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-sky-600 uppercase tracking-wider">Suma Tyg.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {Object.entries(weeklyCalorieSummaryTable.persons).map(([personName, dailyData]) => (
                <tr key={personName}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800">{personName}</td>
                  {DAYS_OF_WEEK.map(day => (
                    <td key={`${personName}-${day}`} className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 text-right">
                      {dailyData[day] > 0 ? dailyData[day] : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-sky-700 text-right">{dailyData.total > 0 ? dailyData.total : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100">
                <tr>
                    <td className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase">Suma Dnia</td>
                    {DAYS_OF_WEEK.map(day => (
                        <td key={`total-${day}`} className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                            {weeklyCalorieSummaryTable.dailyTotals[day] > 0 ? weeklyCalorieSummaryTable.dailyTotals[day] : '-'}
                        </td>
                    ))}
                    <td className="px-3 py-2 text-right text-xs font-bold text-sky-700">
                        {weeklyCalorieSummaryTable.grandTotal > 0 ? weeklyCalorieSummaryTable.grandTotal : '-'}
                    </td>
                </tr>
            </tfoot>
          </table>
        )}
      </div>

    </div>
  );
};

export default MealPlannerDashboard;
