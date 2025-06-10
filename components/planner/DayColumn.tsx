
import React from 'react';
import { PlannedMeal, DayOfWeek } from '../../types';
import MealCard from './MealCard';
import Button from '../ui/Button';
import { PlusIcon } from '../../constants.tsx';
import { MEAL_TYPES } from '../../constants';

interface DayColumnProps {
  day: DayOfWeek;
  meals: PlannedMeal[];
  onAddMeal: (day: DayOfWeek) => void;
  onEditMeal: (meal: PlannedMeal) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, meals, onAddMeal, onEditMeal }) => {
  return (
    <div className="bg-slate-100 p-4 rounded-lg shadow-md min-h-[200px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-700 mb-3 text-center border-b pb-2">{day}</h3>
      <div className="space-y-3 flex-grow">
        {meals.length > 0 ? (
          MEAL_TYPES.map(mealType => {
            const mealsForType = meals.filter(m => m.meal_type === mealType)
                                      .sort((a,b) => (a.custom_meal_name || a.recipe_id || '').localeCompare(b.custom_meal_name || b.recipe_id || '')); // Basic sort, can be improved

            if (mealsForType.length === 0) return null;

            return (
              <div key={mealType}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3 mb-1.5 pl-1">{mealType}</h4>
                <div className="space-y-2">
                  {mealsForType.map(meal => (
                    <MealCard key={meal.id} meal={meal} onEdit={onEditMeal} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-400 text-center mt-4">Brak zaplanowanych posiłków.</p>
        )}
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => onAddMeal(day)} 
        className="w-full mt-4"
        leftIcon={<PlusIcon className="w-4 h-4"/>}
      >
        Dodaj posiłek
      </Button>
    </div>
  );
};

export default DayColumn;
