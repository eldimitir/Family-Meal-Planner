
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { DayOfWeek, PlannedMeal } from '../../types';
import DayColumn from './DayColumn';
import AddMealModal from './AddMealModal';
import Button from '../ui/Button';
import { DAYS_OF_WEEK } from '../../constants';
import { PrintIcon, TrashIcon } from '../../constants.tsx';

const MealPlannerDashboard: React.FC = () => {
  const { weeklyPlan, clearWeeklyPlan } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [mealToEdit, setMealToEdit] = useState<PlannedMeal | undefined>(undefined);
  const navigate = useNavigate();

  const handleAddMeal = (day: DayOfWeek) => {
    setSelectedDay(day);
    setMealToEdit(undefined);
    setIsModalOpen(true);
  };

  const handleEditMeal = (meal: PlannedMeal) => {
    setSelectedDay(meal.day as DayOfWeek);
    setMealToEdit(meal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setMealToEdit(undefined);
  };

  const handlePrintPlan = () => {
    navigate('/planer/drukuj');
  };

  const handleClearPlan = () => {
    if (window.confirm("Czy na pewno chcesz wyczyścić cały plan tygodniowy? Tej operacji nie można cofnąć.")) {
      clearWeeklyPlan();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Planer Posiłków</h1>
        <div className="flex gap-2 flex-wrap">
            <Button onClick={handleClearPlan} variant="danger" size="sm" leftIcon={<TrashIcon />}>
                Wyczyść Plan
            </Button>
            <Button onClick={handlePrintPlan} variant="primary" size="sm" leftIcon={<PrintIcon />}>
                Drukuj Plan Tygodnia
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map(day => (
          <DayColumn
            key={day}
            day={day}
            meals={weeklyPlan[day] || []}
            onAddMeal={handleAddMeal}
            onEditMeal={handleEditMeal}
          />
        ))}
      </div>

      {selectedDay && (
        <AddMealModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          day={selectedDay}
          mealToEdit={mealToEdit}
        />
      )}
      
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Podsumowanie Tygodnia</h2>
        {Object.values(weeklyPlan).flat().length === 0 ? (
          <p className="text-slate-500">Brak zaplanowanych posiłków w tym tygodniu.</p>
        ) : (
          <ul className="space-y-1">
            {DAYS_OF_WEEK.map(day => {
              const mealsForDay = weeklyPlan[day] || [];
              if (mealsForDay.length === 0) return null;
              return (
                <li key={day}>
                  <strong className="text-slate-600">{day}:</strong> {mealsForDay.map(m => m.customMealName || useData().getRecipeById(m.recipeId || '')?.title || 'Posiłek').join(', ')}
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
};

export default MealPlannerDashboard;
    