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
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]); // Changed to array
  const [isCustomMeal, setIsCustomMeal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRecipe = useMemo(() => {
    if (!recipeId) return null;
    return getRecipeById(recipeId);
  }, [recipeId, getRecipeById]);

  useEffect(() => {
    if (isOpen) {
      if (mealToEdit) {
        setMealType(mealToEdit.meal_type);
        setRecipeId(mealToEdit.recipe_id);
        setCustomMealName(mealToEdit.custom_meal_name || '');
        setSelectedPersons(mealToEdit.persons || []);
        setIsCustomMeal(!!mealToEdit.custom_meal_name && !mealToEdit.recipe_id);
      } else { // New meal
        setMealType(MEAL_TYPES[0]);
        const firstRecipeId = allRecipes.length > 0 ? allRecipes[0].id : null;
        setRecipeId(firstRecipeId);
        setCustomMealName('');
        
        const firstRecipe = firstRecipeId ? getRecipeById(firstRecipeId) : null;
        setSelectedPersons(firstRecipe?.persons || []); // Default to all persons from the first recipe
        setIsCustomMeal(false);
      }
      setIsSubmitting(false);
    }
  }, [mealToEdit, allRecipes, isOpen, getRecipeById]);

  // Update selectedPersons when recipeId changes (for new meal or recipe change)
  useEffect(() => {
    if (isOpen && !mealToEdit) { // Only for new meals or if recipe explicitly changes
      if (selectedRecipe && selectedRecipe.persons) {
        setSelectedPersons(selectedRecipe.persons); // Default to all persons in the recipe
      } else {
        setSelectedPersons([]);
      }
    }
  }, [selectedRecipe, isOpen, mealToEdit]);


  const recipeOptions = allRecipes.map(r => ({ value: r.id, label: r.title }));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mealPayload = {
      day,
      meal_type: mealType,
      recipe_id: isCustomMeal ? null : recipeId,
      custom_meal_name: isCustomMeal ? customMealName.trim() : undefined,
      persons: isCustomMeal || !selectedRecipe || selectedPersons.length === 0 ? null : selectedPersons,
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
  
  const handleRecipeChange = (newRecipeId: string | null) => {
    setRecipeId(newRecipeId);
    const recipe = newRecipeId ? getRecipeById(newRecipeId) : null;
    if (recipe) { 
      setIsCustomMeal(false);
      setCustomMealName('');
      setSelectedPersons(recipe.persons || []); // Default to all persons in new recipe
    } else {
      setSelectedPersons([]); // Clear persons if no recipe or custom meal
      if (!isCustomMeal) setIsCustomMeal(true); // If recipe cleared, maybe it's custom
    }
  };

  const handlePersonToggle = (personName: string) => {
    setSelectedPersons(prev => 
      prev.includes(personName) 
        ? prev.filter(p => p !== personName) 
        : [...prev, personName]
    );
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
              const custom = e.target.checked;
              setIsCustomMeal(custom);
              if (custom) {
                setRecipeId(null); // Clear recipe if custom
                setSelectedPersons([]); // Clear persons
              } else if (allRecipes.length > 0) {
                // If unchecking custom, reselect first recipe and its persons
                const firstRecipe = getRecipeById(allRecipes[0].id);
                setRecipeId(allRecipes[0].id);
                setSelectedPersons(firstRecipe?.persons || []);

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
              onChange={(e) => handleRecipeChange(e.target.value || null)}
              placeholder="Wybierz przepis..."
              disabled={isCustomMeal || allRecipes.length === 0 || isSubmitting}
              required={!isCustomMeal}
            />
            {allRecipes.length === 0 && !isCustomMeal && (
                <p className="text-sm text-yellow-600">Nie masz jeszcze żadnych przepisów. Dodaj przepis lub zaznacz "Posiłek niestandardowy".</p>
            )}

            {selectedRecipe && selectedRecipe.persons && selectedRecipe.persons.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Dla kogo:</label>
                <div className="space-y-1 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {selectedRecipe.persons.map(personName => (
                    <div key={personName} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`person-${personName}`}
                        checked={selectedPersons.includes(personName)}
                        onChange={() => handlePersonToggle(personName)}
                        className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                        disabled={isSubmitting}
                      />
                      <label htmlFor={`person-${personName}`} className="ml-2 text-sm text-slate-700">{personName}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
             {selectedRecipe && (!selectedRecipe.persons || selectedRecipe.persons.length === 0) && !isCustomMeal && (
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
