import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AISuggestedRecipe, Ingredient, RecipeCategory } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { ChevronDownIcon } from '../../constants.tsx';

const RecipeAISuggestion: React.FC = () => {
  const { getAIRecipeSuggestion, addRecipe } = useData();
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRecipe, setSuggestedRecipe] = useState<AISuggestedRecipe | null>(null);

  const handleGetSuggestion = async () => {
    if (!userPrompt.trim()) {
      setError("Wpisz opis przepisu, którego szukasz.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestedRecipe(null);
    try {
      const recipe = await getAIRecipeSuggestion(userPrompt);
      if (recipe) {
        setSuggestedRecipe(recipe);
      } else {
        setError("Nie udało się znaleźć sugestii. Spróbuj innego opisu.");
      }
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas pobierania sugestii.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedRecipe = async () => {
    if (!suggestedRecipe) return;
    setIsLoading(true); // Reuse loading state for adding
    setError(null);
    try {
      // The addRecipe function expects ingredients without 'id' and 'recipe_id'
      // AISuggestedRecipe.ingredients already matches this structure Omit<Ingredient, 'id' | 'recipe_id'>[]
      const recipePayload = {
        title: suggestedRecipe.title,
        ingredients: suggestedRecipe.ingredients,
        instructions: suggestedRecipe.instructions,
        prep_time: suggestedRecipe.prep_time,
        category: suggestedRecipe.category,
        tags: suggestedRecipe.tags,
      };
      await addRecipe(recipePayload);
      // Current addRecipe shows an alert, so no success message needed here unless that changes
      setSuggestedRecipe(null); // Clear suggestion after adding
      setUserPrompt(''); // Clear prompt
    } catch (err: any) {
      setError(err.message || "Nie udało się dodać przepisu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-8 p-6 bg-sky-50 border border-sky-200">
      <h2 className="text-2xl font-semibold text-sky-700 mb-4">✨ Potrzebujesz inspiracji? Zapytaj AI o przepis!</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          containerClassName="flex-grow mb-0"
          placeholder="Np. 'szybka wegetariańska zapiekanka' lub 'deser czekoladowy bez pieczenia'"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          disabled={isLoading}
          aria-label="Opis szukanego przepisu"
        />
        <Button onClick={handleGetSuggestion} isLoading={isLoading} disabled={isLoading || !userPrompt.trim()} className="sm:w-auto w-full">
          Pobierz sugestię
        </Button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

      {suggestedRecipe && (
        <Card className="mt-6 bg-white">
          <h3 className="text-xl font-bold text-sky-600 mb-3">{suggestedRecipe.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
            <p><strong>Kategoria:</strong> {suggestedRecipe.category}</p>
            <p><strong>Czas przygotowania:</strong> {suggestedRecipe.prep_time}</p>
          </div>

          {suggestedRecipe.tags.length > 0 && (
            <div className="mb-4">
              <strong>Tagi:</strong> {suggestedRecipe.tags.map(tag => (
                <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1 first:ml-0">{tag}</span>
              ))}
            </div>
          )}

          <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-700 mb-1 flex items-center"><ChevronDownIcon className="w-5 h-5 mr-1 text-sky-600" />Składniki:</h4>
            <ul className="list-disc list-inside pl-2 space-y-0.5 text-sm">
              {suggestedRecipe.ingredients.map((ing, index) => (
                <li key={index}>{ing.name} - {ing.quantity} {ing.unit}</li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-700 mb-1 flex items-center"><ChevronDownIcon className="w-5 h-5 mr-1 text-sky-600" />Instrukcje:</h4>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {typeof suggestedRecipe.instructions === 'string' 
                ? suggestedRecipe.instructions.split('\n').map((step, index) => step.trim() ? <p key={index} className="mb-1"><strong className="text-sky-600">Krok {index + 1}:</strong> {step}</p> : null)
                : <p>Format instrukcji nie jest obsługiwany.</p> 
              }
            </div>
          </div>

          <Button onClick={handleAddSuggestedRecipe} variant="primary" isLoading={isLoading} disabled={isLoading} className="w-full sm:w-auto">
            Dodaj ten przepis do moich przepisów
          </Button>
        </Card>
      )}
    </Card>
  );
};

export default RecipeAISuggestion;
