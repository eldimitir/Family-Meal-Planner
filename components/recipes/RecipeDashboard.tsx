import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import RecipeList from './RecipeList';
import RecipeForm from './RecipeForm';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Recipe } from '../../types';
import { PlusIcon } from '../../constants.tsx';
import RecipeAISuggestion from '../ai/RecipeAISuggestion'; // Added import

const RecipeDashboard: React.FC = () => {
  const { recipes } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | undefined>(undefined);

  const openModalForNew = () => {
    setRecipeToEdit(undefined);
    setIsModalOpen(true);
  };

  const openModalForEdit = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRecipeToEdit(undefined); // Clear after close
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Moje Przepisy</h1>
        <Button onClick={openModalForNew} variant="primary" leftIcon={<PlusIcon />}>
          Dodaj nowy przepis
        </Button>
      </div>

      {/* AI Recipe Suggestion Section */}
      <RecipeAISuggestion />

      <RecipeList recipes={recipes} onEditRecipe={openModalForEdit} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={recipeToEdit ? 'Edytuj przepis' : 'Dodaj nowy przepis'} size="xl">
        <RecipeForm onClose={closeModal} recipeToEdit={recipeToEdit} />
      </Modal>
    </div>
  );
};

export default RecipeDashboard;