
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import Navbar from './components/navigation/Navbar';
import RecipeDashboard from './components/recipes/RecipeDashboard';
import MealPlannerDashboard from './components/planner/MealPlannerDashboard';
import ShoppingListDashboard from './components/shoppingList/ShoppingListDashboard';
import SettingsPage from './components/settings/SettingsPage';
import RecipeDetailView from './components/recipes/RecipeDetailView';
import PlannerPrintView from './components/planner/PlannerPrintView';
import ShoppingListPrintView from './components/shoppingList/ShoppingListPrintView';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 pt-20 md:pt-24"> {/* Added padding top for fixed navbar */}
        <Outlet />
      </main>
      <footer className="no-print bg-slate-800 text-white text-center p-4 text-sm">
        Rodzinny Planer Posiłków © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
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
    