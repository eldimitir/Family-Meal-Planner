import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient, RecipeCategory } from '../../types';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon } from '../../constants.tsx';
import { RECIPE_CATEGORIES_OPTIONS } from '../../constants';

interface RecipeFormProps {
  onClose: () => void;
  recipeToEdit?: Recipe;
}

// Ensure ingredient IDs are strings for consistency, even if transient client-side ones
const initialIngredient: Omit<Ingredient, 'recipe_id'> = { id: crypto.randomUUID(), name: '', quantity: '', unit: '' };

type RecipeFormErrors = Partial<Record<keyof Omit<Recipe, 'ingredients' | 'id' | 'created_at'> | 'formIngredients', string>> & { general?: string };


const RecipeForm: React.FC<RecipeFormProps> = ({ onClose, recipeToEdit }) => {
  const { addRecipe, updateRecipe } = useData();
  const [title, setTitle] = useState('');
  // Store ingredients with client-side temporary IDs for form management
  const [formIngredients, setFormIngredients] = useState<(Omit<Ingredient, 'recipe_id'> & { tempId: string })[]>(
    [{ ...initialIngredient, tempId: crypto.randomUUID() }]
  );
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [category, setCategory] = useState<RecipeCategory>(RecipeCategory.OBIAD);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title);
      // Map existing ingredients to form ingredients with tempIds
      setFormIngredients(recipeToEdit.ingredients.map(ing => ({ ...ing, tempId: ing.id || crypto.randomUUID() })));
      setInstructions(recipeToEdit.instructions);
      setPrepTime(recipeToEdit.prep_time);
      setCategory(recipeToEdit.category);
      setTags(recipeToEdit.tags || []);
    } else {
      // Reset form for new recipe
      setTitle('');
      setFormIngredients([{ ...initialIngredient, tempId: crypto.randomUUID() }]);
      setInstructions('');
      setPrepTime('');
      setCategory(RecipeCategory.OBIAD);
      setTags([]);
      setCurrentTag('');
    }
  }, [recipeToEdit]);

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

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = (): boolean => {
    const newErrors: RecipeFormErrors = {};
    if (!title.trim()) newErrors.title = "Tytuł jest wymagany.";
    if (!instructions.trim()) newErrors.instructions = "Instrukcje są wymagane.";
    if (!prepTime.trim()) newErrors.prep_time = "Czas przygotowania jest wymagany.";
    if (formIngredients.some(ing => !ing.name.trim() || !ing.quantity.trim())) {
      newErrors.formIngredients = "Wszystkie składniki muszą mieć nazwę i ilość.";
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
        .map(({ tempId, id, ...rest }) => ({...rest})); // Remove tempId and original id before sending to Supabase

    const recipePayload = {
      title,
      instructions,
      prep_time: prepTime,
      category,
      tags,
      ingredients: processedIngredients,
    };

    try {
      if (recipeToEdit) {
        await updateRecipe({ ...recipePayload, id: recipeToEdit.id });
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
            <Input containerClassName="mb-0 flex-1" placeholder="Nazwa" value={ingredient.name} onChange={(e) => handleIngredientChange(ingredient.tempId, 'name', e.target.value)} disabled={isSubmitting}/>
            <Input containerClassName="mb-0 w-24" placeholder="Ilość" value={ingredient.quantity} onChange={(e) => handleIngredientChange(ingredient.tempId, 'quantity', e.target.value)} disabled={isSubmitting}/>
            <Input containerClassName="mb-0 w-28" placeholder="Jednostka" value={ingredient.unit} onChange={(e) => handleIngredientChange(ingredient.tempId, 'unit', e.target.value)} disabled={isSubmitting}/>
            <Button type="button" variant="danger" size="sm" onClick={() => removeIngredientField(ingredient.tempId)} disabled={formIngredients.length === 1 || isSubmitting}>
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
      <Input label="Czas przygotowania (np. 30 minut)" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} error={errors.prep_time} required disabled={isSubmitting}/>
      <Select label="Kategoria" options={RECIPE_CATEGORIES_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)} required disabled={isSubmitting}/>

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
                <button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-sky-500 hover:text-sky-700" disabled={isSubmitting}>
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
    </form>
  );
};

export default RecipeForm;