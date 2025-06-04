
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal, Recipe } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Button from '../ui/Button';
import { DAYS_OF_WEEK } from '../../constants';
import { PrintIcon, TrashIcon } from '../../constants.tsx';

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

  const handlePrintPlan = () => {
    navigate('/planer/drukuj');
  };

  const handleClearPlan = () => {
    if (window.confirm("Czy na pewno chcesz wyczyścić cały plan tygodniowy? Tej operacji nie można cofnąć.")) {
      clearWeeklyPlan();
    }
  };

  const weeklyCalorieSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const allPlannedMeals = Object.values(weeklyPlan).flat();
    
    // First, get all unique persons involved in any planned recipe (not just assigned ones)
    const uniquePersonsInPlan = new Set<string>();
    allPlannedMeals.forEach(pm => {
      if (pm.recipe_id) {
        const recipe = getRecipeById(pm.recipe_id);
        if (recipe && recipe.persons) {
          recipe.persons.forEach(person => uniquePersonsInPlan.add(person));
        }
      }
    });

    if (uniquePersonsInPlan.size === 0 && allPlannedMeals.some(pm => pm.recipe_id && getRecipeById(pm.recipe_id)?.calories)) {
      // Handle cases where recipes have calories but no persons defined in them.
      // For this scenario, sum up all calories under a "Ogólne" (General) key.
      let generalCalories = 0;
      allPlannedMeals.forEach(pm => {
        if (pm.recipe_id) {
          const recipe = getRecipeById(pm.recipe_id);
          if (recipe && recipe.calories) {
            generalCalories += recipe.calories;
          }
        }
      });
      if (generalCalories > 0) {
         summary["Ogólne (brak przypisanych osób w przepisach)"] = generalCalories;
      }
    } else {
       uniquePersonsInPlan.forEach(personName => {
        summary[personName] = 0; // Initialize
      });

      allPlannedMeals.forEach(pm => {
        if (pm.recipe_id) {
          const recipe = getRecipeById(pm.recipe_id);
          if (recipe && recipe.calories) {
            if (pm.person && uniquePersonsInPlan.has(pm.person)) { // Meal assigned to a specific person
              summary[pm.person] = (summary[pm.person] || 0) + recipe.calories;
            } else if (!pm.person) { // Meal not assigned to a specific person, add to all unique persons from recipes
              uniquePersonsInPlan.forEach(personName => {
                 // Check if the recipe itself contains this personName, or if it's a general recipe
                if (recipe.persons && recipe.persons.includes(personName) || (recipe.persons && recipe.persons.length === 0) ) {
                    summary[personName] = (summary[personName] || 0) + recipe.calories;
                } else if (recipe.persons && !recipe.persons.includes(personName) && uniquePersonsInPlan.size === 1) {
                    // If only one person is defined in the plan context, and this recipe doesn't list them,
                    // it's ambiguous. For now, let's assume it still contributes if no specific person is assigned to the meal.
                    // This part of the logic is tricky based on the prompt.
                    // Re-evaluating: "Jeżeli osoba nie jest wskazana dolicz do wszystkich istniejących osób kaloryczność przepisu."
                    // "Istniejące osoby" here means uniquePersonsInPlan.
                    summary[personName] = (summary[personName] || 0) + recipe.calories;
                }
              });
            }
          }
        }
      });
    }


    // Filter out persons with 0 calories if there are others with calories
    const nonZeroEntries = Object.entries(summary).filter(([, calories]) => calories > 0);
    if (nonZeroEntries.length > 0) {
        return Object.fromEntries(nonZeroEntries);
    }
    return summary; // Return all if all are zero (e.g. no calories in recipes)

  }, [weeklyPlan, getRecipeById]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Planer Posiłków</h1>
        <div className="flex gap-2 flex-wrap">
            <Button onClick={handleClearPlan} variant="danger" size="sm" leftIcon={<TrashIcon />}>
                Wyczyść Plan
            </Button>
            <Button onClick={handlePrintPlan} variant="primary" size="sm" leftIcon={<PrintIcon />}>
                Drukuj Plan Tygodnia
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
      
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Podsumowanie Kaloryczności Tygodnia</h2>
        {Object.keys(weeklyCalorieSummary).length === 0 && Object.values(weeklyPlan).flat().length > 0 && (
           <p className="text-slate-500">Brak danych o kaloryczności w zaplanowanych przepisach lub brak przypisanych osób.</p>
        )}
        {Object.values(weeklyPlan).flat().length === 0 && (
          <p className="text-slate-500">Brak zaplanowanych posiłków w tym tygodniu.</p>
        )}
        {Object.keys(weeklyCalorieSummary).length > 0 && (
          <ul className="space-y-2">
            {Object.entries(weeklyCalorieSummary).map(([person, calories]) => (
              <li key={person} className="flex justify-between items-center p-2 rounded bg-slate-50 hover:bg-slate-100">
                <strong className="text-slate-700">{person}:</strong> 
                <span className="font-semibold text-sky-600">{calories} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
};

export default MealPlannerDashboard;
