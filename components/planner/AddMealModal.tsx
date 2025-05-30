
import React, { useState, useEffect } from 'react';
import { PlannedMeal, Recipe, DayOfWeek } from '../../types';
import { useData } from '../../contexts/DataContext';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { MEAL_TYPES } from '../../constants';

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayOfWeek;
  mealToEdit?: PlannedMeal;
}

const AddMealModal: React.FC<AddMealModalProps> = ({ isOpen, onClose, day, mealToEdit }) => {
  const { recipes, addPlannedMeal, updatePlannedMeal } = useData();
  const [mealType, setMealType] = useState<string>(MEAL_TYPES[0]);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState<string>('');
  const [servings, setServings] = useState<number>(1);
  const [isCustomMeal, setIsCustomMeal] = useState<boolean>(false);

  useEffect(() => {
    if (mealToEdit) {
      setMealType(mealToEdit.mealType);
      setRecipeId(mealToEdit.recipeId);
      setCustomMealName(mealToEdit.customMealName || '');
      setServings(mealToEdit.servings);
      setIsCustomMeal(!!mealToEdit.customMealName && !mealToEdit.recipeId);
    } else {
      // Reset form for new meal
      setMealType(MEAL_TYPES[0]);
      setRecipeId(recipes.length > 0 ? recipes[0].id : null);
      setCustomMealName('');
      setServings(1);
      setIsCustomMeal(false);
    }
  }, [mealToEdit, recipes, isOpen]); // re-initialize on open

  const recipeOptions = recipes.map(r => ({ value: r.id, label: r.title }));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mealData = {
      day,
      mealType,
      recipeId: isCustomMeal ? null : recipeId,
      customMealName: isCustomMeal ? customMealName : undefined,
      servings,
    };

    if (mealToEdit) {
      updatePlannedMeal({ ...mealData, id: mealToEdit.id });
    } else {
      addPlannedMeal(mealData);
    }
    onClose();
  };
  
  const handleRecipeChange = (selectedRecipeId: string) => {
    setRecipeId(selectedRecipeId);
    if (selectedRecipeId) { // if a recipe is chosen, it's not a custom meal
      setIsCustomMeal(false);
      setCustomMealName('');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mealToEdit ? 'Edytuj' : 'Dodaj'} posiłek na ${day}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Rodzaj posiłku"
          options={MEAL_TYPES.map(mt => ({ value: mt, label: mt }))}
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          required
        />

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="isCustomMeal" 
            checked={isCustomMeal}
            onChange={(e) => {
              setIsCustomMeal(e.target.checked);
              if (e.target.checked) setRecipeId(null); // Clear recipe if custom
            }}
            className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
          />
          <label htmlFor="isCustomMeal" className="text-sm text-slate-700">Posiłek niestandardowy (bez przepisu)</label>
        </div>

        {isCustomMeal ? (
          <Input
            label="Nazwa posiłku niestandardowego"
            value={customMealName}
            onChange={(e) => setCustomMealName(e.target.value)}
            required={isCustomMeal}
          />
        ) : (
          <Select
            label="Wybierz przepis"
            options={recipeOptions}
            value={recipeId || ''}
            onChange={(e) => handleRecipeChange(e.target.value)}
            placeholder="Wybierz przepis..."
            disabled={isCustomMeal || recipes.length === 0}
            required={!isCustomMeal}
          />
        )}
         {recipes.length === 0 && !isCustomMeal && (
            <p className="text-sm text-yellow-600">Nie masz jeszcze żadnych przepisów. Dodaj przepis lub zaznacz "Posiłek niestandardowy".</p>
        )}

        <Select
          label="Liczba osób"
          options={[{ value: 1, label: '1 osoba' }, { value: 2, label: '2 osoby' }]}
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value, 10))}
          required
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="primary" disabled={!isCustomMeal && !recipeId && recipes.length > 0}>
            {mealToEdit ? 'Zapisz zmiany' : 'Dodaj posiłek'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMealModal;
    