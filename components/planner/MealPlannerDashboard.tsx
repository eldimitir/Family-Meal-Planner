import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal, Recipe, WeeklyCalorieTableSummary, PersonWeeklyCalorieSummary, DailyCalorieDetails, MealTypeCalorieBreakdown, OverallDailyCalorieDetails } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Button from '../ui/Button';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PrintIcon, TrashIcon, EyeIcon } from '../../constants.tsx'; 

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
      overallDailyTotals: {},
      grandTotal: 0,
    };

    // Initialize overallDailyTotals
    DAYS_OF_WEEK.forEach(day => {
        summary.overallDailyTotals[day] = {
            mealTypes: MEAL_TYPES.reduce((acc, mt) => ({...acc, [mt]: 0}), {} as MealTypeCalorieBreakdown),
            dayTotal: 0,
        };
    });

    const allPlannedMeals = Object.values(weeklyPlan).flat();
    const uniquePersonsInPlan = new Set<string>();

    allPlannedMeals.forEach(pm => {
      const recipe = pm.recipe_id ? getRecipeById(pm.recipe_id) : null;
      if (recipe?.persons) {
        recipe.persons.forEach(person => uniquePersonsInPlan.add(person));
      }
      if (pm.persons) {
        pm.persons.forEach(p => uniquePersonsInPlan.add(p));
      }
    });
    
    const personNamesForSummary = Array.from(uniquePersonsInPlan);
    if (personNamesForSummary.length === 0 && allPlannedMeals.some(pm => pm.recipe_id && getRecipeById(pm.recipe_id)?.calories)) {
        personNamesForSummary.push("Ogółem (brak przypisanych osób)");
    }


    personNamesForSummary.forEach(personName => {
      summary.persons[personName] = { days: {}, weeklyTotal: 0 };
      DAYS_OF_WEEK.forEach(day => {
        summary.persons[personName].days[day] = {
          mealTypes: MEAL_TYPES.reduce((acc, mt) => ({ ...acc, [mt]: 0 }), {} as MealTypeCalorieBreakdown),
          dayTotal: 0,
        };
      });
    });
    
    allPlannedMeals.forEach(pm => {
        const recipe = pm.recipe_id ? getRecipeById(pm.recipe_id) : null;
        if (recipe?.calories && recipe.calories > 0) {
            const day = pm.day as DayOfWeek;
            const mealType = pm.meal_type;

            // Update overall daily and meal type totals (counted once per meal)
            if (summary.overallDailyTotals[day]) {
                 summary.overallDailyTotals[day]!.mealTypes[mealType] = (summary.overallDailyTotals[day]!.mealTypes[mealType] || 0) + recipe.calories;
                 summary.overallDailyTotals[day]!.dayTotal += recipe.calories;
            }
            summary.grandTotal += recipe.calories;
            
            // Distribute to persons
            const targets = (pm.persons && pm.persons.length > 0) 
                            ? pm.persons.filter(p => personNamesForSummary.includes(p)) // Only assigned persons who are in the summary scope
                            : personNamesForSummary; // All persons in summary scope if meal not assigned

            targets.forEach(personName => {
                if (summary.persons[personName]?.days[day]) {
                    const personDaySummary = summary.persons[personName].days[day]!;
                    personDaySummary.mealTypes[mealType] = (personDaySummary.mealTypes[mealType] || 0) + recipe.calories;
                    personDaySummary.dayTotal += recipe.calories;
                    summary.persons[personName].weeklyTotal += recipe.calories;
                }
            });
        }
    });

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
           <p className="text-slate-500">Brak danych o kaloryczności w zaplanowanych przepisach lub brak przypisanych osób do podsumowania.</p>
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
                  <th key={day} className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider" title={day}>{day.substring(0,3)}</th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-sky-600 uppercase tracking-wider">Suma Tyg.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {Object.entries(weeklyCalorieSummaryTable.persons).map(([personName, personData]) => (
                <tr key={personName}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800">{personName}</td>
                  {DAYS_OF_WEEK.map(day => {
                    const dayDetails = personData.days[day];
                    const dayTotal = dayDetails?.dayTotal || 0;
                    // Tooltip for meal type breakdown (optional enhancement)
                    // const mealTypeTooltip = dayDetails ? 
                    //   MEAL_TYPES.map(mt => `${mt}: ${dayDetails.mealTypes[mt] || 0}kcal`).join('\n') : '';

                    return (
                        <td key={`${personName}-${day}`} className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 text-right" /*title={mealTypeTooltip}*/>
                        {dayTotal > 0 ? dayTotal : '-'}
                        {/* Optional: Display meal type breakdown directly if needed */}
                        {/* {dayDetails && Object.entries(dayDetails.mealTypes).map(([mt, cal]) => 
                            cal > 0 ? <div key={mt} className="text-xs text-gray-400">{mt.substring(0,3)}: {cal}</div> : null
                        )} */}
                        </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-sky-700 text-right">{personData.weeklyTotal > 0 ? personData.weeklyTotal : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100">
                <tr>
                    <td className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase">Suma Dnia</td>
                    {DAYS_OF_WEEK.map(day => (
                        <td key={`total-${day}`} className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                            {weeklyCalorieSummaryTable.overallDailyTotals[day]?.dayTotal ?? 0 > 0 ? weeklyCalorieSummaryTable.overallDailyTotals[day]?.dayTotal : '-'}
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