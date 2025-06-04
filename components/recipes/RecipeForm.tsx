import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, Ingredient, RecipeCategoryDB } from '../../types';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon } from '../../constants.tsx';

interface RecipeFormProps {
  onClose: () => void;
  recipeToEdit?: Recipe;
}

const initialIngredient: Omit<Ingredient, 'recipe_id'> = { id: crypto.randomUUID(), name: '', quantity: '', unit: '' };

type RecipeFormErrors = Partial<Record<keyof Omit<Recipe, 'ingredients' | 'id' | 'created_at' | 'category_name' | 'category_code_prefix' | 'recipe_internal_prefix'> | 'formIngredients', string>> & { general?: string };

const RecipeForm: React.FC<RecipeFormProps> = ({ onClose, recipeToEdit }) => {
  const { addRecipe, updateRecipe, recipeCategories, units, getAllIngredientNames, isLoadingCategories } = useData();
  
  const [title, setTitle] = useState('');
  const [formIngredients, setFormIngredients] = useState<(Omit<Ingredient, 'recipe_id'> & { tempId: string })[]>(
    [{ ...initialIngredient, tempId: crypto.randomUUID() }]
  );
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null); // Can be null
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [persons, setPersons] = useState<string[]>([]);
  const [currentPerson, setCurrentPerson] = useState('');
  const [calories, setCalories] = useState<number | string>('');
  
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableUnits = useMemo(() => units.map(u => u.name), [units]);
  const availableIngredientNames = useMemo(() => getAllIngredientNames(), [getAllIngredientNames]);

  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title);
      setFormIngredients(recipeToEdit.ingredients.map(ing => ({ ...ing, tempId: ing.id || crypto.randomUUID() })));
      setInstructions(recipeToEdit.instructions);
      setPrepTime(recipeToEdit.prep_time);
      setCategoryId(recipeToEdit.category_id); // Can be null
      setTags(recipeToEdit.tags || []);
      setPersons(recipeToEdit.persons || []);
      setCalories(recipeToEdit.calories === null || typeof recipeToEdit.calories === 'undefined' ? '' : recipeToEdit.calories);
    } else {
      setTitle('');
      setFormIngredients([{ ...initialIngredient, tempId: crypto.randomUUID() }]);
      setInstructions('');
      setPrepTime('');
      setCategoryId(null); // Default to no category selected
      setTags([]);
      setCurrentTag('');
      setPersons([]);
      setCurrentPerson('');
      setCalories('');
    }
  }, [recipeToEdit, recipeCategories]);

  // No automatic default categoryId selection on load for new recipe. User must choose or leave as "Brak kategorii".
  // useEffect(() => {
  //   if (!recipeToEdit && !categoryId && recipeCategories.length > 0 && !isLoadingCategories) {
  //     // setCategoryId(recipeCategories[0].id); // No longer default to first category
  //   }
  // }, [recipeCategories, isLoadingCategories, recipeToEdit, categoryId]);


  const handleIngredientChange = (tempId: string, field: keyof Omit<Ingredient, 'id' | 'recipe_id'>, value: string) => {
    setFormIngredients(prevIngredients =>
      prevIngredients.map(ing =>
        ing.tempId === tempId ? { ...ing, [field]: value } : ing
      )
    );
  };

  const addIngredientField = () => {
    setFormIngredients([...formIngredients, { ...initialIngredient, tempId: crypto.randomUUID() }]);
  };

  const removeIngredientField = (tempId: string) => {
    setFormIngredients(formIngredients.filter(ing => ing.tempId !== tempId));
  };

  const handleTagAdd = () => {
    if (currentTag.trim() !== '' && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };
  const handleTagRemove = (tagToRemove: string) => setTags(tags.filter(tag => tag !== tagToRemove));

  const handlePersonAdd = () => {
    if (currentPerson.trim() !== '' && !persons.includes(currentPerson.trim())) {
      setPersons([...persons, currentPerson.trim()]);
      setCurrentPerson('');
    }
  };
  const handlePersonRemove = (personToRemove: string) => setPersons(persons.filter(person => person !== personToRemove));

  const categoryOptions = [
    { value: "", label: "Brak kategorii" }, // Option for no category
    ...recipeCategories.map(cat => ({ value: cat.id, label: `${String(cat.prefix).padStart(3, '0')} - ${cat.name}` }))
  ];

  const validateForm = (): boolean => {
    const newErrors: RecipeFormErrors = {};
    if (!title.trim()) newErrors.title = "Tytuł jest wymagany.";
    if (!instructions.trim()) newErrors.instructions = "Instrukcje są wymagane.";
    if (!prepTime.trim()) newErrors.prep_time = "Czas przygotowania jest wymagany.";
    // categoryId can be null, so no validation needed for it being present.
    // if (!categoryId) newErrors.category_id = "Kategoria jest wymagana.";
    if (formIngredients.some(ing => !ing.name.trim() || !ing.quantity.trim())) {
      newErrors.formIngredients = "Wszystkie składniki muszą mieć nazwę i ilość.";
    }
    if (calories !== '' && isNaN(Number(calories))) {
        newErrors.calories = "Kaloryczność musi być liczbą.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const processedIngredients = formIngredients
        .filter(ing => ing.name.trim() !== '')
        .map(({ tempId, id, ...rest }) => ({...rest}));

    const recipePayload: Omit<Recipe, 'id' | 'created_at' | 'ingredients' | 'recipe_internal_prefix' | 'category_name' | 'category_code_prefix'> & { ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[] } = {
      title,
      instructions,
      prep_time: prepTime,
      category_id: categoryId || null, // Pass null if empty string (no category selected)
      tags,
      persons,
      calories: calories === '' || calories === null ? null : parseInt(String(calories), 10),
      ingredients: processedIngredients,
    };

    try {
      if (recipeToEdit) {
        await updateRecipe({ ...recipePayload, id: recipeToEdit.id, recipe_internal_prefix: recipeToEdit.recipe_internal_prefix });
      } else {
        await addRecipe(recipePayload);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save recipe", error);
      setErrors(prev => ({ ...prev, general: "Nie udało się zapisać przepisu."}));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input label="Tytuł przepisu" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required disabled={isSubmitting}/>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Składniki</label>
        {formIngredients.map((ingredient) => (
          <div key={ingredient.tempId} className="flex items-center space-x-2 mb-2">
            <Input 
                containerClassName="mb-0 flex-1" 
                placeholder="Nazwa" 
                value={ingredient.name} 
                onChange={(e) => handleIngredientChange(ingredient.tempId, 'name', e.target.value)} 
                disabled={isSubmitting}
                list="ingredient-names"
            />
            <Input containerClassName="mb-0 w-24" placeholder="Ilość" value={ingredient.quantity} onChange={(e) => handleIngredientChange(ingredient.tempId, 'quantity', e.target.value)} disabled={isSubmitting}/>
            <Input 
                containerClassName="mb-0 w-28" 
                placeholder="Jednostka" 
                value={ingredient.unit} 
                onChange={(e) => handleIngredientChange(ingredient.tempId, 'unit', e.target.value)} 
                disabled={isSubmitting}
                list="ingredient-units"
            />
            <Button type="button" variant="danger" size="sm" onClick={() => removeIngredientField(ingredient.tempId)} disabled={formIngredients.length === 1 || isSubmitting} aria-label="Usuń składnik">
              <TrashIcon />
            </Button>
          </div>
        ))}
        {errors.formIngredients && <p className="text-xs text-red-600">{errors.formIngredients}</p>}
        <Button type="button" variant="secondary" size="sm" onClick={addIngredientField} leftIcon={<PlusIcon />} disabled={isSubmitting}>
          Dodaj składnik
        </Button>
      </div>

      <Textarea label="Instrukcje przygotowania" value={instructions} onChange={(e) => setInstructions(e.target.value)} error={errors.instructions} required disabled={isSubmitting}/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Czas przygotowania (np. 30 minut)" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} error={errors.prep_time} required disabled={isSubmitting}/>
        <Select 
            label="Kategoria" 
            options={categoryOptions} 
            value={categoryId || ""} // Handle null value for select
            onChange={(e) => setCategoryId(e.target.value || null)} // Set to null if "" selected
            error={errors.category_id} 
            // Not required anymore, can be "Brak kategorii"
            disabled={isSubmitting || isLoadingCategories}
            placeholder={isLoadingCategories ? "Ładowanie kategorii..." : "Wybierz kategorię"}
        />
      </div>
      <Input 
        label="Kaloryczność (opcjonalnie)" 
        type="number" 
        value={calories} 
        onChange={(e) => setCalories(e.target.value)} 
        error={errors.calories} 
        disabled={isSubmitting}
        placeholder="np. 500"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Osoby (np. Michał, Kasia)</label>
        <div className="flex items-center space-x-2 mb-2">
          <Input containerClassName="mb-0 flex-1" placeholder="Dodaj osobę" value={currentPerson} onChange={(e) => setCurrentPerson(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePersonAdd();}}}
            disabled={isSubmitting}
          />
          <Button type="button" variant="secondary" size="sm" onClick={handlePersonAdd} disabled={isSubmitting}>Dodaj osobę</Button>
        </div>
        {persons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {persons.map(person => (
              <span key={person} className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-sm flex items-center">
                {person}
                <button type="button" onClick={() => handlePersonRemove(person)} className="ml-1 text-sky-500 hover:text-sky-700" disabled={isSubmitting} aria-label={`Usuń osobę ${person}`}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tagi</label>
        <div className="flex items-center space-x-2 mb-2">
          <Input containerClassName="mb-0 flex-1" placeholder="Dodaj tag (np. wegetariańskie)" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd();}}}
            disabled={isSubmitting}
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleTagAdd} disabled={isSubmitting}>Dodaj tag</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-sky-500 hover:text-sky-700" disabled={isSubmitting} aria-label={`Usuń tag ${tag}`}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {errors.general && <p className="text-xs text-red-600 text-center">{errors.general}</p>}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
          {recipeToEdit ? 'Zapisz zmiany' : 'Dodaj przepis'}
        </Button>
      </div>
      <datalist id="ingredient-units">
        {availableUnits.map(unitName => <option key={unitName} value={unitName} />)}
      </datalist>
      <datalist id="ingredient-names">
        {availableIngredientNames.map(name => <option key={name} value={name} />)}
      </datalist>
    </form>
  );
};

export default RecipeForm;
