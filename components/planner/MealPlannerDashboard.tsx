
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal, WeeklyCalorieTableSummary, PersonDailyCalorieSummary, WeeklyMealTypeCalorieSummary, MealTypeDailyCalorieSummary, ArchivedPlan } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { DAYS_OF_WEEK, MEAL_TYPES } from '../../constants';
import { PrintIcon, TrashIcon, EyeIcon, PlusIcon, ArrowDownTrayIcon, ArrowPathIcon } from '../../constants.tsx'; 

const MealPlannerDashboard: React.FC = () => {
  const { 
    weeklyPlan, clearWeeklyPlan, getRecipeById, recipes: allRecipes, persons: allSystemPersons, 
    archiveCurrentPlan, isLoadingArchivedPlans: isLoadingArchiveAction, 
    archivedPlans, restorePlan, refreshArchivedPlans, 
    isLoadingArchivedPlans: isLoadingArchivedPlansList, 
    errorArchivedPlans 
  } = useData();
  
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [mealToEdit, setMealToEdit] = useState<PlannedMeal | undefined>(undefined);
  const navigate = useNavigate();

  // Removed useEffect for refreshArchivedPlans - data is loaded by loadInitialData in DataContext

  const handleAddMeal = (day: DayOfWeek) => {
    setSelectedDay(day);
    setMealToEdit(undefined);
    setIsAddMealModalOpen(true);
  };

  const handleEditMeal = (meal: PlannedMeal) => {
    setSelectedDay(meal.day as DayOfWeek);
    setMealToEdit(meal);
    setIsAddMealModalOpen(true);
  };

  const handleCloseAddMealModal = () => {
    setIsAddMealModalOpen(false);
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

  const handleOpenArchiveModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setArchiveName(`Plan - ${today}`);
    setIsArchiveModalOpen(true);
  };
  
  const handleOpenRestoreModal = () => {
    refreshArchivedPlans(); 
    setIsRestoreModalOpen(true);
  };

  const handleArchivePlan = async () => {
    if (!archiveName.trim()) {
      alert("Nazwa archiwum jest wymagana.");
      return;
    }
    const success = await archiveCurrentPlan(archiveName.trim());
    if (success) {
      alert(`Plan "${archiveName.trim()}" został zarchiwizowany.`);
      setIsArchiveModalOpen(false);
      setArchiveName('');
    } else {
      alert("Nie udało się zarchiwizować planu.");
    }
  };

  const handleRestoreArchivedPlan = async (planId: string, planName: string) => {
    if (window.confirm(`Czy na pewno chcesz przywrócić plan "${planName}"? Obecny plan tygodniowy zostanie wyczyszczony i nadpisany.`)) {
      await restorePlan(planId);
      setIsRestoreModalOpen(false); 
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

    allPlannedMeals.forEach(pm => {
        if (pm.persons_names && pm.persons_names.length > 0) {
            pm.persons_names.forEach(name => uniquePersonNamesInPlan.add(name));
        } else if (pm.recipe_id) { 
            const recipe = getRecipeById(pm.recipe_id);
            if(recipe) {
                if (recipe.persons_names && recipe.persons_names.length > 0) {
                     recipe.persons_names.forEach(name => uniquePersonNamesInPlan.add(name));
                } else { 
                    allSystemPersons.forEach(p => uniquePersonNamesInPlan.add(p.name));
                }
            }
        } else if (pm.custom_meal_name) { 
             allSystemPersons.forEach(p => uniquePersonNamesInPlan.add(p.name));
        }
    });

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
                    const caloriesPerServing = recipe.calories; 

                    if (pm.persons_names && pm.persons_names.length > 0) { 
                        pm.persons_names.forEach(personName => {
                            if (summary.persons[personName]) {
                                summary.persons[personName][day] = (summary.persons[personName][day] || 0) + caloriesPerServing;
                                summary.persons[personName].total += caloriesPerServing;
                            }
                        });
                    } else { 
                        if (uniquePersonNamesInPlan.size > 0) {
                            uniquePersonNamesInPlan.forEach(personName => {
                                if (summary.persons[personName]) {
                                    summary.persons[personName][day] = (summary.persons[personName][day] || 0) + caloriesPerServing;
                                    summary.persons[personName].total += caloriesPerServing;
                                }
                            });
                        } else if (summary.persons[generalPersonName]) { 
                             summary.persons[generalPersonName][day] = (summary.persons[generalPersonName][day] || 0) + caloriesPerServing;
                             summary.persons[generalPersonName].total += caloriesPerServing;
                        }
                    }
                    summary.dailyTotals[day] = (summary.dailyTotals[day] || 0) + caloriesPerServing;
                    summary.grandTotal += caloriesPerServing;
                }
            }
        });
    });
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

  const isPlanEmpty = useMemo(() => Object.values(weeklyPlan).every(dayMeals => dayMeals.length === 0), [weeklyPlan]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Planer Posiłków</h1>
        <div className="flex gap-2 flex-wrap">
            <Button onClick={handleOpenRestoreModal} variant="secondary" size="sm" leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />} disabled={isLoadingArchivedPlansList}>
                Przywróć z Archiwum
            </Button>
            <Button onClick={handleOpenArchiveModal} variant="secondary" size="sm" leftIcon={<PlusIcon className="w-4 h-4" />} disabled={isPlanEmpty || isLoadingArchiveAction}>
                Archiwizuj Plan
            </Button>
            <Button onClick={handleClearPlan} variant="danger" size="sm" leftIcon={<TrashIcon />} disabled={isPlanEmpty}>
                Wyczyść Plan
            </Button>
            <Button onClick={handleShowPlan} variant="primary" size="sm" leftIcon={<EyeIcon />} disabled={isPlanEmpty}>
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
          isOpen={isAddMealModalOpen}
          onClose={handleCloseAddMealModal}
          day={selectedDay}
          mealToEdit={mealToEdit}
        />
      )}

      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Archiwizuj Plan Posiłków">
        <div className="space-y-4">
          <Input
            label="Nazwa archiwum"
            value={archiveName}
            onChange={(e) => setArchiveName(e.target.value)}
            placeholder="Np. Plan Wakacyjny Sierpień"
            required
          />
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>Anuluj</Button>
            <Button variant="primary" onClick={handleArchivePlan} isLoading={isLoadingArchiveAction} disabled={!archiveName.trim()}>Zarchiwizuj</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="Przywróć Plan z Archiwum" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoadingArchivedPlansList && <p>Ładowanie zarchiwizowanych planów...</p>}
          {errorArchivedPlans && <p className="text-red-500">Błąd ładowania archiwów: {errorArchivedPlans.message}</p>}
          {!isLoadingArchivedPlansList && !errorArchivedPlans && archivedPlans.length === 0 && (
            <p className="text-slate-500 text-center py-4">Brak zarchiwizowanych planów.</p>
          )}
          {!isLoadingArchivedPlansList && !errorArchivedPlans && archivedPlans.length > 0 && (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nazwa Archiwum</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Data Archiwizacji</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Akcja</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {archivedPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700">{plan.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{new Date(plan.archived_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleRestoreArchivedPlan(plan.id, plan.name)}
                        leftIcon={<ArrowPathIcon className="w-4 h-4"/>}
                        title={`Przywróć plan ${plan.name}`}
                       >
                         Przywróć
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
           <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={() => setIsRestoreModalOpen(false)}>Zamknij</Button>
          </div>
        </div>
      </Modal>
      
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
