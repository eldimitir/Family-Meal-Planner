import React, { useState, useEffect, useMemo } from 'react';
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
  const { recipes: allRecipes, addPlannedMeal, updatePlannedMeal, getRecipeById } = useData();
  const [mealType, setMealType] = useState<string>(MEAL_TYPES[0]);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [isCustomMeal, setIsCustomMeal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRecipe = useMemo(() => {
    if (!recipeId) return null;
    return getRecipeById(recipeId);
  }, [recipeId, getRecipeById]);

  const personOptions = useMemo(() => {
    if (!selectedRecipe || !selectedRecipe.persons || selectedRecipe.persons.length === 0) {
      return [];
    }
    return selectedRecipe.persons.map(p => ({ value: p, label: p }));
  }, [selectedRecipe]);

  useEffect(() => {
    if (isOpen) {
      if (mealToEdit) {
        setMealType(mealToEdit.meal_type);
        setRecipeId(mealToEdit.recipe_id);
        setCustomMealName(mealToEdit.custom_meal_name || '');
        setSelectedPerson(mealToEdit.person);
        setIsCustomMeal(!!mealToEdit.custom_meal_name && !mealToEdit.recipe_id);
      } else {
        setMealType(MEAL_TYPES[0]);
        const firstRecipeId = allRecipes.length > 0 ? allRecipes[0].id : null;
        setRecipeId(firstRecipeId);
        setCustomMealName('');
        // Set selectedPerson based on the first recipe's persons if available
        const firstRecipe = firstRecipeId ? getRecipeById(firstRecipeId) : null;
        setSelectedPerson(firstRecipe && firstRecipe.persons.length > 0 ? firstRecipe.persons[0] : null);
        setIsCustomMeal(false);
      }
      setIsSubmitting(false);
    }
  }, [mealToEdit, allRecipes, isOpen, getRecipeById]);

  // Adjust selectedPerson if recipe changes or personOptions change
  useEffect(() => {
    if (selectedRecipe && selectedRecipe.persons && selectedRecipe.persons.length > 0) {
      if (!selectedPerson || !selectedRecipe.persons.includes(selectedPerson)) {
        setSelectedPerson(selectedRecipe.persons[0]);
      }
    } else {
      setSelectedPerson(null); // No persons in recipe or no recipe selected
    }
  }, [selectedRecipe, personOptions, selectedPerson]);


  const recipeOptions = allRecipes.map(r => ({ value: r.id, label: r.title }));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mealPayload = {
      day,
      meal_type: mealType,
      recipe_id: isCustomMeal ? null : recipeId,
      custom_meal_name: isCustomMeal ? customMealName.trim() : undefined,
      person: isCustomMeal ? null : selectedPerson, // Person only relevant for recipe-based meals
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
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRecipeChange = (selectedRecipeId: string) => {
    setRecipeId(selectedRecipeId);
    if (selectedRecipeId) { 
      setIsCustomMeal(false);
      setCustomMealName('');
      // selectedPerson will be updated by the useEffect hook
    } else {
      setSelectedPerson(null);
    }
  };

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
              if (e.target.checked) {
                setRecipeId(null);
                setSelectedPerson(null);
              }
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
          <>
            <Select
              label="Wybierz przepis"
              options={recipeOptions}
              value={recipeId || ''}
              onChange={(e) => handleRecipeChange(e.target.value)}
              placeholder="Wybierz przepis..."
              disabled={isCustomMeal || allRecipes.length === 0 || isSubmitting}
              required={!isCustomMeal}
            />
            {allRecipes.length === 0 && !isCustomMeal && (
                <p className="text-sm text-yellow-600">Nie masz jeszcze żadnych przepisów. Dodaj przepis lub zaznacz "Posiłek niestandardowy".</p>
            )}
            {selectedRecipe && personOptions.length > 0 && (
              <Select
                label="Dla kogo"
                options={personOptions}
                value={selectedPerson || ''}
                onChange={(e) => setSelectedPerson(e.target.value)}
                placeholder="Wybierz osobę..."
                disabled={isSubmitting || !recipeId}
              />
            )}
            {selectedRecipe && personOptions.length === 0 && !isCustomMeal && (
                 <p className="text-sm text-slate-500 mt-1">Ten przepis nie ma przypisanych osób. Posiłek zostanie dodany jako ogólny.</p>
            )}
          </>
        )}
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
