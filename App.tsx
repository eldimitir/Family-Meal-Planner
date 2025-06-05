
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext'; 
import LoginScreen from './components/auth/LoginScreen';
import Navbar from './components/navigation/Navbar';
import RecipeDashboard from './components/recipes/RecipeDashboard';
import MealPlannerDashboard from './components/planner/MealPlannerDashboard';
import ShoppingListDashboard from './components/shoppingList/ShoppingListDashboard';
import SettingsPage from './components/settings/SettingsPage';
import RecipeDetailView from './components/recipes/RecipeDetailView';
import PlannerPreviewPage from './components/planner/PlannerPreviewPage';
import PlannerPrintView from './components/planner/PlannerPrintView';
import ShoppingListPrintView from './components/shoppingList/ShoppingListPrintView';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { 
    isLoadingRecipes, isLoadingPlanner, isLoadingCategories, isLoadingUnits, isLoadingPersons, isLoadingArchivedPlans,
    errorRecipes, errorPlanner, errorCategories, errorUnits, errorPersons, errorArchivedPlans 
  } = useData(); 

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoadingRecipes || isLoadingPlanner || isLoadingCategories || isLoadingUnits || isLoadingPersons || isLoadingArchivedPlans) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-xl font-semibold text-slate-700">Ładowanie danych...</div>
      </div>
    );
  }

  const anyError = errorRecipes || errorPlanner || errorCategories || errorUnits || errorPersons || errorArchivedPlans;
  if (anyError) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="text-xl font-semibold text-red-700">Błąd ładowania danych</div>
        <p className="text-red-600 mt-2">Nie udało się pobrać danych z serwera. Spróbuj odświeżyć stronę.</p>
        {errorRecipes && <p className="text-xs text-red-500 mt-1">Błąd przepisów: {errorRecipes.message}</p>}
        {errorPlanner && <p className="text-xs text-red-500 mt-1">Błąd planera: {errorPlanner.message}</p>}
        {errorCategories && <p className="text-xs text-red-500 mt-1">Błąd kategorii: {errorCategories.message}</p>}
        {errorUnits && <p className="text-xs text-red-500 mt-1">Błąd jednostek: {errorUnits.message}</p>}
        {errorPersons && <p className="text-xs text-red-500 mt-1">Błąd osób: {errorPersons.message}</p>}
        {errorArchivedPlans && <p className="text-xs text-red-500 mt-1">Błąd zarchiwizowanych planów: {errorArchivedPlans.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 pt-20 md:pt-24"> 
        <Outlet />
      </main>
      <footer className="no-print bg-slate-800 text-white text-center p-4 text-sm">
        Rodzinny Planer Posiłków © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();


  if (authIsLoading) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-xl font-semibold text-slate-700">Ładowanie aplikacji...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/przepisy" replace />} />
        <Route path="/przepisy" element={<RecipeDashboard />} />
        <Route path="/przepisy/:id" element={<RecipeDetailView printMode={false} />} />
        <Route path="/przepisy/:id/drukuj" element={<RecipeDetailView printMode={true} />} />
        <Route path="/planer" element={<MealPlannerDashboard />} />
        <Route path="/planer/podglad" element={<PlannerPreviewPage />} />
        <Route path="/planer/drukuj" element={<PlannerPrintView />} />
        <Route path="/lista-zakupow" element={<ShoppingListDashboard />} />
        <Route path="/lista-zakupow/drukuj" element={<ShoppingListPrintView />} />
        <Route path="/ustawienia" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
};

export default App;
