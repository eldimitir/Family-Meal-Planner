import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recipe } from '../../types';
import { useData } from '../../contexts/DataContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { EditIcon, TrashIcon, PrintIcon } from '../../constants.tsx';
import { formatPrefix } from '../../constants';

interface RecipeItemProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
}

const RecipeItem: React.FC<RecipeItemProps> = ({ recipe, onEdit }) => {
  const { deleteRecipe } = useData();
  const navigate = useNavigate();

  const handleDelete = () => {
    if (window.confirm(`Czy na pewno chcesz usunąć przepis "${recipe.title}"?`)) {
      deleteRecipe(recipe.id);
    }
  };

  const formattedCategoryPrefix = recipe.category_id ? formatPrefix(recipe.category_code_prefix) : null;
  const formattedRecipePrefix = recipe.category_id ? formatPrefix(recipe.recipe_internal_prefix) : formatPrefix(recipe.recipe_internal_prefix); // recipe_internal_prefix always exists


  return (
    <Card className="flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-semibold text-sky-700 mb-0.5 break-words">
          <Link to={`/przepisy/${recipe.id}`} className="hover:underline">
            {recipe.title}
          </Link>
        </h3>
        {(formattedCategoryPrefix !== null || recipe.category_id === null) && ( // Show prefix line if category exists or if it's uncategorized (to show its own prefix)
             <p className="font-mono text-xs text-slate-500 mb-2">
                {recipe.category_id ? `${formattedCategoryPrefix}.${formattedRecipePrefix}` : `---.${formattedRecipePrefix}`}
             </p>
        )}
        
        <p className="text-sm text-slate-500 mb-1">Kategoria: {recipe.category_name || 'Brak kategorii'}</p>
        <p className="text-sm text-slate-500 mb-1">Czas przygotowania: {recipe.prep_time}</p>
        {recipe.calories !== null && typeof recipe.calories !== 'undefined' && <p className="text-sm text-slate-500 mb-3">Kaloryczność: {recipe.calories} kcal</p>}

        {recipe.persons && recipe.persons.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-slate-400">Dla: {recipe.persons.join(', ')}</p>
          </div>
        )}

        {recipe.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
            {recipe.tags.length > 3 && <span className="text-xs text-slate-500">...</span>}
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => onEdit(recipe)} leftIcon={<EditIcon />} title="Edytuj przepis">
           <span className="hidden sm:inline">Edytuj</span>
        </Button>
         <Button variant="ghost" size="sm" onClick={() => navigate(`/przepisy/${recipe.id}/drukuj`)} leftIcon={<PrintIcon />} title="Drukuj przepis">
           <span className="hidden sm:inline">Drukuj</span>
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} leftIcon={<TrashIcon />} title="Usuń przepis">
           <span className="hidden sm:inline">Usuń</span>
        </Button>
      </div>
    </Card>
  );
};

export default RecipeItem;
