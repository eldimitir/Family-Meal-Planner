import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Recipe } from '../../types';
import Button from '../ui/Button';
import { PrintIcon, EditIcon, ChevronDownIcon, TrashIcon } from '../../constants.tsx';
import { formatPrefix } from '../../constants';

interface RecipeDetailViewProps {
  printMode: boolean;
}

const RecipeDetailView: React.FC<RecipeDetailViewProps> = ({ printMode }) => {
  const { id } = useParams<{ id: string }>();
  const { getRecipeById, deleteRecipe, isLoadingRecipes, isLoadingPersons } = useData(); 
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined); 

  useEffect(() => {
    if (id && !isLoadingRecipes && !isLoadingPersons) { 
      const foundRecipe = getRecipeById(id);
      setRecipe(foundRecipe || null); 
      if (foundRecipe && printMode) {
        setTimeout(() => window.print(), 500);
      }
    }
  }, [id, getRecipeById, navigate, printMode, isLoadingRecipes, isLoadingPersons]);

  if (isLoadingRecipes || isLoadingPersons || recipe === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl text-slate-500">Ładowanie przepisu...</p>
      </div>
    );
  }
  
  if (!recipe) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white shadow-xl rounded-lg p-8">
        <p className="text-2xl text-red-600 font-semibold">Nie znaleziono przepisu</p>
        <p className="text-slate-500 mt-2">Przepis o podanym ID nie istnieje lub został usunięty.</p>
        <Button onClick={() => navigate('/przepisy')} variant="primary" className="mt-6">
          Wróć do listy przepisów
        </Button>
      </div>
    );
  }
  
  const handlePrint = () => {
     navigate(`/przepisy/${recipe.id}/drukuj`);
  };

  const handleEdit = () => {
    navigate('/przepisy', { state: { recipeIdForEdit: recipe.id } });
  };

  const handleDelete = async () => {
    if (window.confirm(`Czy na pewno chcesz usunąć przepis "${recipe.title}"? Tej operacji nie można cofnąć.`)) {
      await deleteRecipe(recipe.id);
      navigate('/przepisy'); 
    }
  };

  const formattedCategoryPrefix = recipe.category_id ? formatPrefix(recipe.category_code_prefix) : null;
  const formattedRecipePrefix = recipe.category_id ? formatPrefix(recipe.recipe_internal_prefix) : formatPrefix(recipe.recipe_internal_prefix);


  return (
    <div className={`p-4 md:p-8 ${printMode ? 'print-container' : 'bg-white shadow-xl rounded-lg'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 no-print gap-2">
        <Button onClick={() => navigate('/przepisy')} variant="ghost" size="sm" leftIcon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        }>
          Wróć do listy
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleEdit} 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={<EditIcon />}
                  title="Edytuj przepis">
            Edytuj
          </Button>
          <Button onClick={handleDelete}
                  variant="danger"
                  size="sm"
                  leftIcon={<TrashIcon />}
                  title="Usuń przepis">
            Usuń
          </Button>
          {!printMode && (
            <Button onClick={handlePrint} variant="primary" size="sm" leftIcon={<PrintIcon />}>
                Drukuj
            </Button>
          )}
        </div>
      </div>

      <article className="prose prose-slate max-w-none lg:prose-xl">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-sky-700">
            {recipe.title}
          </h1>
          {(formattedCategoryPrefix !== null || recipe.category_id === null) && (
             <p className="font-mono text-lg md:text-xl text-slate-500 mt-1">
                {recipe.category_id ? `${formattedCategoryPrefix}.${formattedRecipePrefix}` : `---.${formattedRecipePrefix}`}
             </p>
          )}
          <div className="mt-3 text-sm text-slate-600 flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1">
            <span><strong>Kategoria:</strong> {recipe.category_name || 'Brak kategorii'}</span>
            <span><strong>Czas przygotowania:</strong> {recipe.prep_time}</span>
            {recipe.calories !== null && typeof recipe.calories !== 'undefined' && <span><strong>Kaloryczność:</strong> {recipe.calories} kcal</span>}
            {recipe.tags.length > 0 && (
              <span><strong>Tagi:</strong> {recipe.tags.join(', ')}</span>
            )}
             {recipe.persons_names && recipe.persons_names.length > 0 && (
              <span><strong>Dla:</strong> {recipe.persons_names.join(', ')}</span>
            )}
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-700 mb-3 flex items-center">
            <ChevronDownIcon className="w-6 h-6 mr-2 text-sky-600" /> Składniki
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            {recipe.ingredients.map(ingredient => (
              <li key={ingredient.id} className="text-slate-700">
                {ingredient.name} - {ingredient.quantity} {ingredient.unit}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-slate-700 mb-3 flex items-center">
            <ChevronDownIcon className="w-6 h-6 mr-2 text-sky-600" /> Instrukcje przygotowania
          </h2>
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
            {recipe.instructions.split('\n').map((step, index) => (
              step.trim() ? <p key={index} className="mb-2"><strong className="text-sky-600">Krok {index + 1}:</strong> {step}</p> : null
            ))}
          </div>
        </section>
      </article>
      
      {printMode && (
        <footer className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
          Rodzinny Planer Posiłków - {recipe.title}
        </footer>
      )}
    </div>
  );
};

export default RecipeDetailView;
