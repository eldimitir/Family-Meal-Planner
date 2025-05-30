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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { // Reset form state when modal opens or mealToEdit changes
      if (mealToEdit) {
        setMealType(mealToEdit.meal_type);
        setRecipeId(mealToEdit.recipe_id);
        setCustomMealName(mealToEdit.custom_meal_name || '');
        setServings(mealToEdit.servings);
        setIsCustomMeal(!!mealToEdit.custom_meal_name && !mealToEdit.recipe_id);
      } else {
        setMealType(MEAL_TYPES[0]);
        setRecipeId(recipes.length > 0 ? recipes[0].id : null);
        setCustomMealName('');
        setServings(1);
        setIsCustomMeal(false);
      }
      setIsSubmitting(false); // Reset submitting state
    }
  }, [mealToEdit, recipes, isOpen]);

  const recipeOptions = recipes.map(r => ({ value: r.id, label: r.title }));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mealPayload = {
      day,
      meal_type: mealType,
      recipe_id: isCustomMeal ? null : recipeId,
      custom_meal_name: isCustomMeal ? customMealName.trim() : undefined,
      servings,
    };

    try {
      if (mealToEdit) {
        await updatePlannedMeal({ ...mealPayload, id: mealToEdit.id });
      } else {
        await addPlannedMeal(mealPayload);
      }
      onClose();
    } catch (error) {
        console.error("Failed to save meal plan:", error);
        // TODO: Show an error message to the user
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRecipeChange = (selectedRecipeId: string) => {
    setRecipeId(selectedRecipeId);
    if (selectedRecipeId) { 
      setIsCustomMeal(false);
      setCustomMealName('');
    }
  }

  const canSubmit = isCustomMeal ? customMealName.trim() !== '' : !!recipeId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mealToEdit ? 'Edytuj' : 'Dodaj'} posiłek na ${day}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Rodzaj posiłku"
          options={MEAL_TYPES.map(mt => ({ value: mt, label: mt }))}
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          required
          disabled={isSubmitting}
        />

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="isCustomMeal" 
            checked={isCustomMeal}
            onChange={(e) => {
              setIsCustomMeal(e.target.checked);
              if (e.target.checked) setRecipeId(null); 
            }}
            className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
            disabled={isSubmitting}
          />
          <label htmlFor="isCustomMeal" className="text-sm text-slate-700">Posiłek niestandardowy (bez przepisu)</label>
        </div>

        {isCustomMeal ? (
          <Input
            label="Nazwa posiłku niestandardowego"
            value={customMealName}
            onChange={(e) => setCustomMealName(e.target.value)}
            required={isCustomMeal}
            disabled={isSubmitting}
          />
        ) : (
          <Select
            label="Wybierz przepis"
            options={recipeOptions}
            value={recipeId || ''}
            onChange={(e) => handleRecipeChange(e.target.value)}
            placeholder="Wybierz przepis..."
            disabled={isCustomMeal || recipes.length === 0 || isSubmitting}
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
          disabled={isSubmitting}
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || isSubmitting} isLoading={isSubmitting}>
            {mealToEdit ? 'Zapisz zmiany' : 'Dodaj posiłek'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMealModal;
