
import React, { useState, useMemo } from 'react';
import { Recipe, RecipeCategoryDB } from '../../types'; // RecipeCategoryDB instead of RecipeCategory
import RecipeItem from './RecipeItem';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useData } from '../../contexts/DataContext'; // Import useData to access categories

interface RecipeListProps {
  recipes: Recipe[];
  onEditRecipe: (recipe: Recipe) => void;
}

const RecipeList: React.FC<RecipeListProps> = ({ recipes, onEditRecipe }) => {
  const { recipeCategories, isLoadingCategories } = useData(); // Get categories from context
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(''); // Filter by ID now
  const [filterTag, setFilterTag] = useState('');

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    recipes.forEach(recipe => recipe.tags.forEach(tag => tagsSet.add(tag)));
    return Array.from(tagsSet).sort();
  }, [recipes]);

  const categoryOptions = useMemo(() => {
    return [
      { value: '', label: 'Wszystkie kategorie' },
      ...recipeCategories.map(cat => ({ value: cat.id, label: cat.name }))
    ];
  }, [recipeCategories]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const titleMatch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase());
      const ingredientMatch = recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const categoryMatch = filterCategoryId ? recipe.category_id === filterCategoryId : true;
      const tagMatch = filterTag ? recipe.tags.includes(filterTag) : true;
      
      return (titleMatch || ingredientMatch) && categoryMatch && tagMatch;
    }).sort((a,b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Newest first
    });
  }, [recipes, searchTerm, filterCategoryId, filterTag]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow">
        <Input
          placeholder="Szukaj po tytule lub składniku..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="md:col-span-1"
        />
        <Select
          options={categoryOptions}
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          containerClassName="md:col-span-1"
          disabled={isLoadingCategories || categoryOptions.length <= 1}
          placeholder={isLoadingCategories ? "Ładowanie kategorii..." : "Wybierz kategorię"}
        />
        <Select
          options={[{ value: '', label: 'Wszystkie tagi' }, ...allTags.map(tag => ({ value: tag, label: tag }))]}
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          containerClassName="md:col-span-1"
          disabled={allTags.length === 0}
        />
      </div>

      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeItem key={recipe.id} recipe={recipe} onEdit={onEditRecipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-slate-500">Nie znaleziono przepisów pasujących do kryteriów.</p>
          <p className="text-slate-400 mt-2">Spróbuj zmienić filtry lub dodać nowy przepis.</p>
        </div>
      )}
    </div>
  );
};

export default RecipeList;
