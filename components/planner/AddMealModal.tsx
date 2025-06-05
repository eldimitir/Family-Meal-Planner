import React, { useState, useEffect, useMemo } from 'react';
import { PlannedMeal, Recipe, DayOfWeek, Person } from '../../types';
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
  const { recipes: allRecipes, addPlannedMeal, updatePlannedMeal, getRecipeById, persons: allSystemPersons, isLoadingPersons } = useData();
  
  const [mealType, setMealType] = useState<string>(MEAL_TYPES[0]);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState<string>('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [isCustomMeal, setIsCustomMeal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRecipe = useMemo(() => {
    if (!recipeId) return null;
    return getRecipeById(recipeId);
  }, [recipeId, getRecipeById]);

  // Effect to initialize form state when modal opens or mealToEdit changes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (mealToEdit) {
        setMealType(mealToEdit.meal_type);
        setRecipeId(mealToEdit.recipe_id);
        setCustomMealName(mealToEdit.custom_meal_name || '');
        setSelectedPersonIds(mealToEdit.person_ids || []);
        setIsCustomMeal(!!mealToEdit.custom_meal_name && !mealToEdit.recipe_id);
      } else { // New meal
        setMealType(MEAL_TYPES[0]);
        const firstRecipe = allRecipes.length > 0 ? allRecipes[0] : null;
        setRecipeId(firstRecipe ? firstRecipe.id : null);
        setCustomMealName('');
        setIsCustomMeal(false);
        // Default persons selection logic is handled in the next useEffect based on recipeId / allSystemPersons
      }
    }
  }, [mealToEdit, allRecipes, isOpen]);

  // Effect to update selectedPersonIds based on current recipe or custom meal state
  useEffect(() => {
    if (isOpen) {
      if (isCustomMeal) {
        setSelectedPersonIds(allSystemPersons.map(p => p.id)); // Select all for custom meal
      } else if (selectedRecipe) {
        if (selectedRecipe.person_ids && selectedRecipe.person_ids.length > 0) {
          setSelectedPersonIds(selectedRecipe.person_ids); // Select persons from recipe
        } else {
          setSelectedPersonIds(allSystemPersons.map(p => p.id)); // Recipe has no persons, select all system persons
        }
      } else { // No recipe selected (e.g. initial state for new meal, or recipe cleared)
         setSelectedPersonIds(allSystemPersons.map(p => p.id)); // Default to all system persons selected
      }
    }
  }, [isOpen, isCustomMeal, selectedRecipe, allSystemPersons]);


  const recipeOptions = allRecipes.map(r => ({ value: r.id, label: r.title }));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mealPayload = {
      day,
      meal_type: mealType,
      recipe_id: isCustomMeal ? null : recipeId,
      custom_meal_name: isCustomMeal ? customMealName.trim() : undefined,
      person_ids: selectedPersonIds.length > 0 ? selectedPersonIds : null,
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
    if (newRecipeId) { 
      setIsCustomMeal(false);
      setCustomMealName('');
      // Person selection will be updated by the useEffect watching `selectedRecipe`
    } else {
      // If recipe cleared and not intending custom meal, set to custom
      if (!isCustomMeal) setIsCustomMeal(true); 
    }
  };

  const handlePersonToggle = (personId: string) => {
    setSelectedPersonIds(prev => 
      prev.includes(personId) 
        ? prev.filter(p => p !== personId) 
        : [...prev, personId]
    );
  };

  const canSubmit = isCustomMeal ? customMealName.trim() !== '' : !!recipeId;
  const displayPersonsForSelection = isCustomMeal ? allSystemPersons : (selectedRecipe?.persons_names ? allSystemPersons.filter(p => selectedRecipe.person_ids?.includes(p.id) || (selectedRecipe.person_ids === null || selectedRecipe.person_ids.length === 0)) : allSystemPersons) ;


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mealToEdit ? 'Edytuj' : 'Dodaj'} posiłek na ${day}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
                setRecipeId(null); 
              } else if (allRecipes.length > 0) {
                 // If unchecking custom, reselect first recipe
                setRecipeId(allRecipes[0].id);
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
          <Select
            label="Wybierz przepis"
            options={recipeOptions}
            value={recipeId || ''}
            onChange={(e) => handleRecipeChange(e.target.value || null)}
            placeholder="Wybierz przepis..."
            disabled={isCustomMeal || allRecipes.length === 0 || isSubmitting}
            required={!isCustomMeal}
          />
        )}
        {allRecipes.length === 0 && !isCustomMeal && (
            <p className="text-sm text-yellow-600">Nie masz jeszcze żadnych przepisów. Dodaj przepis lub zaznacz "Posiłek niestandardowy".</p>
        )}

        {!isLoadingPersons && allSystemPersons.length > 0 && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Dla kogo:</label>
            <div className="space-y-1 max-h-32 overflow-y-auto p-2 border rounded-md">
              {allSystemPersons.map(person => (
                <div key={person.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`person-meal-${person.id}`}
                    checked={selectedPersonIds.includes(person.id)}
                    onChange={() => handlePersonToggle(person.id)}
                    className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                    disabled={isSubmitting}
                  />
                  <label htmlFor={`person-meal-${person.id}`} className="ml-2 text-sm text-slate-700">{person.name}</label>
                </div>
              ))}
            </div>
             {selectedRecipe && !isCustomMeal && (!selectedRecipe.person_ids || selectedRecipe.person_ids.length === 0) && (
                 <p className="text-xs text-slate-500 mt-1">Ten przepis nie ma przypisanych osób. Domyślnie zaznaczono wszystkie osoby w systemie. Odznacz, jeśli posiłek jest tylko dla wybranych.</p>
            )}
          </div>
        )}
         {isLoadingPersons && <p className="text-sm text-slate-500">Ładowanie listy osób...</p>}


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
