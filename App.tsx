import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useGoogleSheetsApi } from './contexts/GoogleSheetsApiContext';
import { useData } from './contexts/DataContext';
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
  const { isLoadingData, dataError, isSavingData } = useData();


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 pt-20 md:pt-24"> {/* Added padding top for fixed navbar */}
        { (isLoadingData || isSavingData) && (
          <div className="fixed top-16 left-0 right-0 z-50 no-print"> {/* Below navbar */}
            <div className={`px-4 py-1 text-center text-xs font-semibold ${isSavingData ? 'bg-green-500 text-white' : 'bg-sky-500 text-white'}`}>
              {isSavingData ? 'Zapisywanie danych...' : 'Ładowanie danych...'}
            </div>
          </div>
        )}
        { dataError && (
           <div className="fixed top-16 left-0 right-0 z-50 no-print"> {/* Below navbar */}
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md m-2 shadow-md" role="alert">
                <strong className="font-bold">Błąd danych: </strong>
                <span className="block sm:inline">{dataError.message}</span>
            </div>
           </div>
        )}
        <div className={`${(isLoadingData || isSavingData || dataError) ? 'pt-8' : ''}`}> {/* Add padding if banners are shown */}
          <Outlet />
        </div>
      </main>
      <footer className="no-print bg-slate-800 text-white text-center p-4 text-sm">
        Rodzinny Planer Posiłków © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { isLoadingGapi, gapiError, isGapiReady } = useGoogleSheetsApi();
  // DataContext also has isLoadingData, but isLoadingGapi is for GAPI init itself

  if (authIsLoading || isLoadingGapi) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-xl font-semibold text-slate-700">
          {authIsLoading ? 'Sprawdzanie autoryzacji...' : 'Inicjalizacja API Google...'}
        </div>
      </div>
    );
  }

  if (gapiError) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Błąd krytyczny API Google</h1>
          <p className="text-slate-700 mb-2">Nie udało się połączyć lub skonfigurować Google Sheets API.</p>
          <p className="text-sm text-slate-600 mb-4">Szczegóły: {gapiError.message}</p>
          <p className="text-xs text-slate-500">
            Sprawdź konsolę przeglądarki po więcej informacji. Upewnij się, że SPREADSHEET_ID jest poprawnie ustawiony w `constants.ts`
            oraz API_KEY jest dostępny i poprawnie skonfigurowany w Google Cloud Console z włączonym Google Sheets API.
          </p>
        </div>
      </div>
    );
  }
  
  // If GAPI is ready, DataProvider will handle its own loading state for actual data.
  // If GAPI is not ready and no error, it means it's still in an indeterminate loading state handled by isLoadingGapi.

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated && isGapiReady ? <Navigate to="/" /> : <LoginScreen />} />
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
      <Route path="*" element={<Navigate to={isAuthenticated && isGapiReady ? "/" : "/login"} />} />
    </Routes>
  );
};

export default App;