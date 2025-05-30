
import React from 'react';
import { PlannedMeal } from '../../types';
import { useData } from '../../contexts/DataContext';
import Button from '../ui/Button';
import { EditIcon, TrashIcon } from '../../constants.tsx';

interface MealCardProps {
  meal: PlannedMeal;
  onEdit: (meal: PlannedMeal) => void;
}

const MealCard: React.FC<MealCardProps> = ({ meal, onEdit }) => {
  const { getRecipeById, deletePlannedMeal } = useData();
  const recipe = meal.recipeId ? getRecipeById(meal.recipeId) : null;

  const handleDelete = () => {
    if (window.confirm(`Czy na pewno chcesz usunąć ten posiłek?`)) {
      deletePlannedMeal(meal.id, meal.day);
    }
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-shadow border border-slate-200">
      <h4 className="font-semibold text-sky-700 truncate" title={recipe?.title || meal.customMealName}>
        {recipe?.title || meal.customMealName || 'Niezdefiniowany posiłek'}
      </h4>
      <p className="text-xs text-slate-500">{meal.mealType}</p>
      <p className="text-xs text-slate-500">Dla: {meal.servings} {meal.servings === 1 ? 'osoby' : 'osób'}</p>
      <div className="mt-2 flex justify-end space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(meal)} className="p-1">
          <EditIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="p-1 text-red-500 hover:text-red-700">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MealCard;
    