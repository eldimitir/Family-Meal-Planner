
import React, { useState, useRef, useEffect } from 'react';
import { PlannedMeal, DayOfWeek } from '../../types';
import { useData } from '../../contexts/DataContext';
import Button from '../ui/Button';
import { EditIcon, TrashIcon, ClipboardDocumentListIcon } from '../../constants.tsx';
import { DAYS_OF_WEEK } from '../../constants';

interface MealCardProps {
  meal: PlannedMeal;
  onEdit: (meal: PlannedMeal) => void;
}

const MealCard: React.FC<MealCardProps> = ({ meal, onEdit }) => {
  const { getRecipeById, deletePlannedMeal, copyPlannedMeals } = useData();
  const recipe = meal.recipe_id ? getRecipeById(meal.recipe_id) : null;
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    if (window.confirm(`Czy na pewno chcesz usunąć ten posiłek?`)) {
      deletePlannedMeal(meal.id);
    }
  };

  const handleCopyMeal = (targetDays: DayOfWeek[] | 'all') => {
    const { id, created_at, persons_names, day, ...originalMealCoreData } = meal;
    
    let daysToCopyTo: DayOfWeek[];
    if (targetDays === 'all') {
      daysToCopyTo = DAYS_OF_WEEK;
    } else {
      daysToCopyTo = targetDays;
    }
    
    copyPlannedMeals(originalMealCoreData, daysToCopyTo);
    setIsCopyMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };

    if (isCopyMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCopyMenuOpen]);


  return (
    <div className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-shadow border border-slate-200 relative">
      <h4 className="font-semibold text-sky-700 truncate" title={recipe?.title || meal.custom_meal_name}>
        {recipe?.title || meal.custom_meal_name || 'Niezdefiniowany posiłek'}
      </h4>
      <p className="text-xs text-slate-500">{meal.meal_type}</p>
      {meal.persons_names && meal.persons_names.length > 0 && (
        <p className="text-xs text-slate-500 truncate" title={`Dla: ${meal.persons_names.join(', ')}`}>
            Dla: {meal.persons_names.join(', ')}
        </p>
      )}
      <div className="mt-2 flex justify-end space-x-1">
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCopyMenuOpen(prev => !prev)} 
            className="p-1" 
            aria-label="Kopiuj posiłek"
            title="Kopiuj posiłek do..."
        >
            <ClipboardDocumentListIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(meal)} className="p-1" aria-label="Edytuj posiłek" title="Edytuj posiłek">
          <EditIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="p-1 text-red-500 hover:text-red-700" aria-label="Usuń posiłek" title="Usuń posiłek">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>

      {isCopyMenuOpen && (
        <div 
            ref={copyMenuRef}
            className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10 py-1"
            role="menu" 
            aria-orientation="vertical" 
            aria-labelledby="copy-meal-button"
        >
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              onClick={() => handleCopyMeal([day])}
              className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              role="menuitem"
            >
              Kopiuj do {day}
            </button>
          ))}
          <div className="border-t border-slate-200 my-1"></div>
          <button
            onClick={() => handleCopyMeal('all')}
            className="block w-full text-left px-3 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
            role="menuitem"
          >
            Kopiuj do wszystkich dni
          </button>
        </div>
      )}
    </div>
  );
};

export default MealCard;
