
import React from 'react';
import Card from '../ui/Card';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Ustawienia</h1>
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Ogólne Ustawienia Aplikacji</h2>
        <p className="text-slate-600">
          Witaj w sekcji ustawień. Obecnie ta sekcja jest w budowie.
        </p>
        <p className="text-slate-600 mt-2">
          W przyszłości znajdziesz tutaj opcje konfiguracji, takie jak:
        </p>
        <ul className="list-disc list-inside text-slate-600 mt-2 pl-4">
          <li>Zmiana hasła dostępu (wymagałoby to innego mechanizmu niż obecny hardcoded).</li>
          <li>Dostosowanie domyślnych typów posiłków.</li>
          <li>Import/Eksport danych aplikacji (np. przepisów, planów).</li>
          <li>Ustawienia powiadomień (jeśli byłyby dodane).</li>
        </ul>
         <p className="text-slate-500 mt-6 text-sm">
            Pamiętaj, że obecna wersja aplikacji przechowuje wszystkie dane (przepisy, plany) 
            lokalnie w Twojej przeglądarce. Wyczyść dane przeglądarki, aby usunąć wszystkie informacje.
        </p>
      </Card>
       <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Informacje o Aplikacji</h2>
        <p className="text-slate-600">
          <strong>Nazwa:</strong> Rodzinny Planer Posiłków
        </p>
        <p className="text-slate-600">
          <strong>Wersja:</strong> 1.0.0 (Demo)
        </p>
         <p className="text-slate-600 mt-2">
           Ta aplikacja została stworzona, aby pomóc w organizacji codziennego planowania posiłków.
        </p>
      </Card>
    </div>
  );
};

export default SettingsPage;
    