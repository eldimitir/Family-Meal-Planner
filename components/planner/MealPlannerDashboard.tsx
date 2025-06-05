import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal, WeeklyCalorieTableSummary, PersonDailyCalorieSummary, WeeklyMealTypeCalorieSummary, MealTypeDailyCalorieSummary } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Button from '../ui/Button';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PrintIcon, TrashIcon, EyeIcon } from '../../constants.tsx';

const MealPlannerDashboard: React.FC = () => {
  const { weeklyPlan, clearWeeklyPlan, getRecipeById, recipes: allRecipes, persons: allSystemPersons } = useData();
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
    navigate('/planer/podglad');
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
    const uniquePersonNamesInPlan = new Set<string>();

    // Populate uniquePersonNamesInPlan from planned meal's persons_names or system persons if meal applies to all
     allPlannedMeals.forEach(pm => {
        if (pm.persons_names && pm.persons_names.length > 0) {
            pm.persons_names.forEach(name => uniquePersonNamesInPlan.add(name));
        } else if (pm.recipe_id) { // If meal has a recipe but no specific persons, it might apply to all
            const recipe = getRecipeById(pm.recipe_id);
            if(recipe) { // If recipe exists
                 // If recipe has persons, add them. If not, it means it's for all system persons in this context.
                if (recipe.persons_names && recipe.persons_names.length > 0) {
                     recipe.persons_names.forEach(name => uniquePersonNamesInPlan.add(name));
                } else { // Recipe has no persons, assume it applies to all system persons for calorie count
                    allSystemPersons.forEach(p => uniquePersonNamesInPlan.add(p.name));
                }
            }
        } else if (pm.custom_meal_name) { // Custom meal without specific persons, applies to all system persons
             allSystemPersons.forEach(p => uniquePersonNamesInPlan.add(p.name));
        }
    });


    // If no persons are defined anywhere (neither in recipes, nor in planned meals, nor in system) 
    // but there are recipes with calories, sum under "Ogółem"
    const generalPersonName = "Ogółem (brak przypisanych osób)";
    if (uniquePersonNamesInPlan.size === 0 && allPlannedMeals.some(pm => pm.recipe_id && getRecipeById(pm.recipe_id)?.calories)) {
        summary.persons[generalPersonName] = DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), { total: 0 } as PersonDailyCalorieSummary);
    } else {
        uniquePersonNamesInPlan.forEach(personName => {
          summary.persons[personName] = DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), { total: 0 } as PersonDailyCalorieSummary);
        });
    }
    
    DAYS_OF_WEEK.forEach(day => {
        weeklyPlan[day]?.forEach(pm => {
            if (pm.recipe_id) {
                const recipe = getRecipeById(pm.recipe_id);
                if (recipe?.calories && recipe.calories > 0) {
                    const caloriesPerServing = recipe.calories; // Assume calories are per serving of the recipe

                    if (pm.persons_names && pm.persons_names.length > 0) { // Meal assigned to specific persons
                        pm.persons_names.forEach(personName => {
                            if (summary.persons[personName]) {
                                summary.persons[personName][day] = (summary.persons[personName][day] || 0) + caloriesPerServing;
                                summary.persons[personName].total += caloriesPerServing;
                            }
                        });
                    } else { // Meal not assigned to specific persons (could be from recipe with no persons, or custom meal logic if it had calories)
                        // Add to all unique persons in plan or to "Ogółem"
                        if (uniquePersonNamesInPlan.size > 0) {
                            uniquePersonNamesInPlan.forEach(personName => {
                                if (summary.persons[personName]) {
                                    summary.persons[personName][day] = (summary.persons[personName][day] || 0) + caloriesPerServing;
                                    summary.persons[personName].total += caloriesPerServing;
                                }
                            });
                        } else if (summary.persons[generalPersonName]) { // Add to "Ogółem"
                             summary.persons[generalPersonName][day] = (summary.persons[generalPersonName][day] || 0) + caloriesPerServing;
                             summary.persons[generalPersonName].total += caloriesPerServing;
                        }
                    }
                    // Add to daily and grand totals (once per meal instance)
                    summary.dailyTotals[day] = (summary.dailyTotals[day] || 0) + caloriesPerServing;
                    summary.grandTotal += caloriesPerServing;
                }
            }
        });
    });
    // If "Ogółem" exists and has 0 total, but grandTotal > 0, remove "Ogółem" if other persons exist.
    if (summary.persons[generalPersonName]?.total === 0 && summary.grandTotal > 0 && Object.keys(summary.persons).length > 1) {
        delete summary.persons[generalPersonName];
    }


    return summary;
  }, [weeklyPlan, getRecipeById, allRecipes, allSystemPersons]);


  const weeklyMealTypeCalorieSummary = useMemo((): WeeklyMealTypeCalorieSummary => {
    const summary: WeeklyMealTypeCalorieSummary = {
        mealTypes: MEAL_TYPES.reduce((acc, type) => ({
            ...acc,
            [type]: DAYS_OF_WEEK.reduce((dayAcc, day) => ({ ...dayAcc, [day]: 0 }), { total: 0 } as MealTypeDailyCalorieSummary)
        }), {} as Record<string, MealTypeDailyCalorieSummary>),
        dailyTotals: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 0 }), {} as Record<DayOfWeek, number>),
        grandTotal: 0,
    };

    DAYS_OF_WEEK.forEach(day => {
        weeklyPlan[day]?.forEach(pm => {
            if (pm.recipe_id) {
                const recipe = getRecipeById(pm.recipe_id);
                if (recipe?.calories && recipe.calories > 0) {
                    const mealCalories = recipe.calories;
                    if (summary.mealTypes[pm.meal_type]) {
                        summary.mealTypes[pm.meal_type][day] = (summary.mealTypes[pm.meal_type][day] || 0) + mealCalories;
                        summary.mealTypes[pm.meal_type].total += mealCalories;
                    }
                    summary.dailyTotals[day] = (summary.dailyTotals[day] || 0) + mealCalories;
                    summary.grandTotal += mealCalories;
                }
            }
        });
    });
    return summary;
  }, [weeklyPlan, getRecipeById]);


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
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Podsumowanie Kaloryczności Tygodnia (kcal) - Na Osobę</h2>
        {Object.keys(weeklyCalorieSummaryTable.persons).length === 0 && Object.values(weeklyPlan).flat().length > 0 && (
           <p className="text-slate-500">Brak danych o kaloryczności w zaplanowanych przepisach lub brak przypisanych osób do planu/przepisów.</p>
        )}
        {Object.values(weeklyPlan).flat().length === 0 && (
          <p className="text-slate-500">Brak zaplanowanych posiłków w tym tygodniu.</p>
        )}

        {Object.keys(weeklyCalorieSummaryTable.persons).length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 mb-8">
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
                    <td className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase">Suma Dnia (wszystkie osoby)</td>
                    {DAYS_OF_WEEK.map(day => (
                        <td key={`total-person-${day}`} className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
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

      <div className="mt-8 p-4 sm:p-6 bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Podsumowanie Kaloryczności Tygodnia (kcal) - Na Rodzaj Posiłku</h2>
         {weeklyMealTypeCalorieSummary.grandTotal === 0 && Object.values(weeklyPlan).flat().length > 0 && (
           <p className="text-slate-500">Brak danych o kaloryczności w zaplanowanych przepisach.</p>
        )}
         {Object.values(weeklyPlan).flat().length === 0 && (
          <p className="text-slate-500">Brak zaplanowanych posiłków w tym tygodniu.</p>
        )}
        {weeklyMealTypeCalorieSummary.grandTotal > 0 && (
            <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
                <thead className="bg-slate-50">
                <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rodzaj Posiłku</th>
                    {DAYS_OF_WEEK.map(day => (
                    <th key={`mt-${day}`} className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{day.substring(0,3)}</th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-medium text-sky-600 uppercase tracking-wider">Suma Tyg.</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                {MEAL_TYPES.map(mealType => (
                    <tr key={mealType}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800">{mealType}</td>
                    {DAYS_OF_WEEK.map(day => (
                        <td key={`${mealType}-${day}`} className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 text-right">
                        {weeklyMealTypeCalorieSummary.mealTypes[mealType]?.[day] > 0 ? weeklyMealTypeCalorieSummary.mealTypes[mealType][day] : '-'}
                        </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-sky-700 text-right">
                        {weeklyMealTypeCalorieSummary.mealTypes[mealType]?.total > 0 ? weeklyMealTypeCalorieSummary.mealTypes[mealType].total : '-'}
                    </td>
                    </tr>
                ))}
                </tbody>
                <tfoot className="bg-slate-100">
                    <tr>
                        <td className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase">Suma Dnia (wszystkie posiłki)</td>
                        {DAYS_OF_WEEK.map(day => (
                            <td key={`total-mealtype-${day}`} className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                                {weeklyMealTypeCalorieSummary.dailyTotals[day] > 0 ? weeklyMealTypeCalorieSummary.dailyTotals[day] : '-'}
                            </td>
                        ))}
                        <td className="px-3 py-2 text-right text-xs font-bold text-sky-700">
                            {weeklyMealTypeCalorieSummary.grandTotal > 0 ? weeklyMealTypeCalorieSummary.grandTotal : '-'}
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
