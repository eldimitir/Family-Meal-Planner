
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import RecipeList from './RecipeList';
import RecipeForm from './RecipeForm';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Recipe } from '../../types';
import { PlusIcon } from '../../constants.tsx';

const RecipeDashboard: React.FC = () => {
  const { recipes } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | undefined>(undefined);

  const location = useLocation();
  const navigate = useNavigate();

  const openModalForNew = () => {
    setRecipeToEdit(undefined);
    setIsModalOpen(true);
  };

  // useCallback to stabilize the function for useEffect dependency
  const openModalForEdit = useCallback((recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setRecipeToEdit(undefined);
  };

  useEffect(() => {
    const recipeIdFromState = location.state?.recipeIdForEdit;
    if (recipeIdFromState && recipes.length > 0) { // Ensure recipes are loaded
      const recipe = recipes.find(r => r.id === recipeIdFromState);
      if (recipe) {
        openModalForEdit(recipe);
        // Clear the state from navigation to prevent re-opening on refresh or other navigation
        navigate(location.pathname, { state: {}, replace: true });
      }
    }
  }, [location.state, recipes, openModalForEdit, navigate]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Moje Przepisy</h1>
        <Button onClick={openModalForNew} variant="primary" leftIcon={<PlusIcon />}>
          Dodaj nowy przepis
        </Button>
      </div>

      <RecipeList recipes={recipes} onEditRecipe={openModalForEdit} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={recipeToEdit ? 'Edytuj przepis' : 'Dodaj nowy przepis'} size="xl">
        <RecipeForm onClose={closeModal} recipeToEdit={recipeToEdit} />
      </Modal>
    </div>
  );
};

export default RecipeDashboard;
