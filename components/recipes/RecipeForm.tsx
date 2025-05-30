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

const initialIngredient: Ingredient = { id: crypto.randomUUID(), name: '', quantity: '', unit: '' };

const RecipeForm: React.FC<RecipeFormProps> = ({ onClose, recipeToEdit }) => {
  const { addRecipe, updateRecipe, isSavingData } = useData();
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([initialIngredient]);
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [category, setCategory] = useState<RecipeCategory>(RecipeCategory.OBIAD);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Recipe | 'ingredients', string>>>({});

  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title);
      setIngredients(recipeToEdit.ingredients.map(ing => ({...ing, id: ing.id || crypto.randomUUID() }))); // Ensure IDs for editing
      setInstructions(recipeToEdit.instructions);
      setPrepTime(recipeToEdit.prepTime);
      setCategory(recipeToEdit.category);
      setTags(recipeToEdit.tags);
    } else {
      // Reset form for new recipe
      setTitle('');
      setIngredients([initialIngredient]);
      setInstructions('');
      setPrepTime('');
      setCategory(RecipeCategory.OBIAD);
      setTags([]);
      setCurrentTag('');
    }
  }, [recipeToEdit]);

  const handleIngredientChange = (index: number, field: keyof Omit<Ingredient, 'id'>, value: string) => {
    const newIngredients = ingredients.map((ing, i) => 
      i === index ? { ...ing, [field]: value } : ing
    );
    setIngredients(newIngredients);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { ...initialIngredient, id: crypto.randomUUID() }]);
  };

  const removeIngredientField = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
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
    const newErrors: Partial<Record<keyof Recipe | 'ingredients', string>> = {};
    if (!title.trim()) newErrors.title = "Tytuł jest wymagany.";
    if (!instructions.trim()) newErrors.instructions = "Instrukcje są wymagane.";
    if (!prepTime.trim()) newErrors.prepTime = "Czas przygotowania jest wymagany.";
    if (ingredients.some(ing => !ing.name.trim() || !ing.quantity.trim())) {
      newErrors.ingredients = "Wszystkie składniki muszą mieć nazwę i ilość.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const recipeData = {
      title,
      ingredients: ingredients.filter(ing => ing.name.trim() !== ''), // Filter out empty ingredients
      instructions,
      prepTime,
      category,
      tags,
    };

    try {
      if (recipeToEdit) {
        await updateRecipe({ ...recipeData, id: recipeToEdit.id, createdAt: recipeToEdit.createdAt });
      } else {
        const added = await addRecipe(recipeData);
        if (!added) {
          // Error already handled by DataContext, maybe show a local message if needed
          console.error("Failed to add recipe, operation returned null");
          // Optionally set an error state here to inform the user on the form
          return; // Prevent closing modal if add failed and not handled globally
        }
      }
      onClose();
    } catch (error) {
        // Error should be caught and set in DataContext.
        // This catch is for any specific handling within the form if needed.
        console.error("Error during recipe save operation:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input label="Tytuł przepisu" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required disabled={isSavingData}/>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Składniki</label>
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="flex items-center space-x-2 mb-2">
            <Input containerClassName="mb-0 flex-1" placeholder="Nazwa" value={ingredient.name} onChange={(e) => handleIngredientChange(index, 'name', e.target.value)} disabled={isSavingData} />
            <Input containerClassName="mb-0 w-24" placeholder="Ilość" value={ingredient.quantity} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)} disabled={isSavingData} />
            <Input containerClassName="mb-0 w-28" placeholder="Jednostka" value={ingredient.unit} onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)} disabled={isSavingData} />
            <Button type="button" variant="danger" size="sm" onClick={() => removeIngredientField(ingredient.id)} disabled={ingredients.length === 1 || isSavingData}>
              <TrashIcon />
            </Button>
          </div>
        ))}
        {errors.ingredients && <p className="text-xs text-red-600">{errors.ingredients}</p>}
        <Button type="button" variant="secondary" size="sm" onClick={addIngredientField} leftIcon={<PlusIcon />} disabled={isSavingData}>
          Dodaj składnik
        </Button>
      </div>

      <Textarea label="Instrukcje przygotowania" value={instructions} onChange={(e) => setInstructions(e.target.value)} error={errors.instructions} required disabled={isSavingData} />
      <Input label="Czas przygotowania (np. 30 minut)" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} error={errors.prepTime} required disabled={isSavingData} />
      <Select label="Kategoria" options={RECIPE_CATEGORIES_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)} required disabled={isSavingData} />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tagi</label>
        <div className="flex items-center space-x-2 mb-2">
          <Input containerClassName="mb-0 flex-1" placeholder="Dodaj tag (np. wegetariańskie)" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd();}}}
            disabled={isSavingData}
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleTagAdd} disabled={isSavingData}>Dodaj tag</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-sky-500 hover:text-sky-700" disabled={isSavingData}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSavingData}>Anuluj</Button>
        <Button type="submit" variant="primary" isLoading={isSavingData} disabled={isSavingData}>
          {recipeToEdit ? 'Zapisz zmiany' : 'Dodaj przepis'}
        </Button>
      </div>
    </form>
  );
};

export default RecipeForm;