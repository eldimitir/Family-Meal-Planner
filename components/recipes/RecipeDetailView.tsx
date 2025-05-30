
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Recipe } from '../../types';
import Button from '../ui/Button';
import { PrintIcon, EditIcon, ChevronDownIcon } from '../../constants.tsx'; // Added ChevronDownIcon

interface RecipeDetailViewProps {
  printMode: boolean;
}

const RecipeDetailView: React.FC<RecipeDetailViewProps> = ({ printMode }) => {
  const { id } = useParams<{ id: string }>();
  const { getRecipeById } = useData();
  const navigate = useNavigate();
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);

  useEffect(() => {
    if (id) {
      const foundRecipe = getRecipeById(id);
      if (foundRecipe) {
        setRecipe(foundRecipe);
        if (printMode) {
          // Delay printing slightly to allow content to render
          setTimeout(() => window.print(), 500);
        }
      } else {
        // Recipe not found, maybe navigate to a 404 page or back
        navigate('/przepisy');
      }
    }
  }, [id, getRecipeById, navigate, printMode]);

  if (!recipe) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl text-slate-500">Ładowanie przepisu...</p>
      </div>
    );
  }
  
  const handlePrint = () => {
     navigate(`/przepisy/${recipe.id}/drukuj`);
  };

  return (
    <div className={`p-4 md:p-8 ${printMode ? 'print-container' : 'bg-white shadow-xl rounded-lg'}`}>
      <div className="flex justify-between items-center mb-6 no-print">
        <Button onClick={() => navigate('/przepisy')} variant="ghost" size="sm" leftIcon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        }>
          Wróć do listy
        </Button>
        <div>
          <Button onClick={() => navigate(`/przepisy/${recipe.id}`)} 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={<EditIcon />} 
                  className="mr-2"
                  title="Przejdź do edycji (funkcjonalność niezaimplementowana w widoku szczegółowym)">
            Edytuj (TODO)
          </Button>
          <Button onClick={handlePrint} variant="primary" size="sm" leftIcon={<PrintIcon />}>
            Drukuj
          </Button>
        </div>
      </div>

      <article className="prose prose-slate max-w-none lg:prose-xl">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-sky-700">{recipe.title}</h1>
          <div className="mt-2 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Kategoria:</strong> {recipe.category}</span>
            <span><strong>Czas przygotowania:</strong> {recipe.prep_time}</span>
            {recipe.tags.length > 0 && (
              <span><strong>Tagi:</strong> {recipe.tags.join(', ')}</span>
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
          {/* Assuming instructions is a block of text, could be split by newlines for steps */}
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