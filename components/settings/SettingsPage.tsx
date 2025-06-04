
import React, { useState } from 'react';
import Card from '../ui/Card';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon } from '../../constants.tsx';
import { Unit } from '../../types';

const SettingsPage: React.FC = () => {
  const { units, addUnit, deleteUnit, isLoadingUnits, errorUnits } = useData();
  const [newUnitName, setNewUnitName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setIsAddingUnit(true);
    const success = await addUnit(newUnitName.trim());
    if (success) {
      setNewUnitName('');
    }
    setIsAddingUnit(false);
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę jednostkę? Może to wpłynąć na istniejące przepisy, które jej używają.")) {
      await deleteUnit(unitId);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Ustawienia</h1>
      
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Zarządzanie Jednostkami Miar</h2>
        <form onSubmit={handleAddUnit} className="flex items-end gap-2 mb-6">
          <Input
            label="Nazwa nowej jednostki"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            placeholder="np. sztuka, gram, ml"
            containerClassName="flex-grow mb-0"
            disabled={isAddingUnit}
          />
          <Button type="submit" variant="primary" leftIcon={<PlusIcon />} isLoading={isAddingUnit} disabled={isAddingUnit || !newUnitName.trim()}>
            Dodaj
          </Button>
        </form>

        {isLoadingUnits && <p className="text-slate-500">Ładowanie jednostek...</p>}
        {errorUnits && <p className="text-red-500">Błąd ładowania jednostek: {errorUnits.message}</p>}
        
        {!isLoadingUnits && !errorUnits && units.length === 0 && (
          <p className="text-slate-500">Brak zdefiniowanych jednostek. Dodaj pierwszą jednostkę powyżej.</p>
        )}

        {!isLoadingUnits && units.length > 0 && (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Nazwa Jednostki
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {units.map((unit: Unit) => (
                  <tr key={unit.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{unit.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDeleteUnit(unit.id)}
                        leftIcon={<TrashIcon className="w-4 h-4" />}
                      >
                        Usuń
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Pozostałe Ustawienia</h2>
        <p className="text-slate-600">
          W przyszłości znajdziesz tutaj więcej opcji konfiguracji.
        </p>
         <p className="text-slate-500 mt-6 text-sm">
            Pamiętaj, że obecna wersja aplikacji przechowuje wszystkie dane (przepisy, plany) 
            lokalnie w Twojej przeglądarce (jeśli używane jest Supabase, to tam). Wyczyść dane przeglądarki lub odpowiednie tabele w Supabase, aby usunąć wszystkie informacje.
        </p>
      </Card>

       <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Informacje o Aplikacji</h2>
        <p className="text-slate-600">
          <strong>Nazwa:</strong> Rodzinny Planer Posiłków
        </p>
        <p className="text-slate-600">
          <strong>Wersja:</strong> 1.1.0 (Demo)
        </p>
         <p className="text-slate-600 mt-2">
           Ta aplikacja została stworzona, aby pomóc w organizacji codziennego planowania posiłków.
        </p>
      </Card>
    </div>
  );
};

export default SettingsPage;
