
import React from 'react';
import { PlannedMeal, DayOfWeek } from '../../types';
import MealCard from './MealCard';
import Button from '../ui/Button';
import { PlusIcon } from '../../constants.tsx';

interface DayColumnProps {
  day: DayOfWeek;
  meals: PlannedMeal[];
  onAddMeal: (day: DayOfWeek) => void;
  onEditMeal: (meal: PlannedMeal) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, meals, onAddMeal, onEditMeal }) => {
  const sortedMeals = [...meals].sort((a, b) => {
    // Simple sort by meal type common order, can be improved
    const order = ["Śniadanie", "Drugie Śniadanie", "Obiad", "Podwieczorek", "Kolacja"];
    return order.indexOf(a.meal_type) - order.indexOf(b.meal_type);
  });

  return (
    <div className="bg-slate-100 p-4 rounded-lg shadow-md min-h-[200px] flex flex-col">
      <h3 className="text-lg font-semibold text-slate-700 mb-3 text-center border-b pb-2">{day}</h3>
      <div className="space-y-3 flex-grow">
        {sortedMeals.length > 0 ? (
          sortedMeals.map(meal => (
            <MealCard key={meal.id} meal={meal} onEdit={onEditMeal} />
          ))
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