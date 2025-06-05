
import React, { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon, EditIcon } from '../../constants.tsx'; 
import { Unit, RecipeCategoryDB, Person, ArchivedPlan, FullExportData } from '../../types';
import Modal from '../ui/Modal';

const SettingsPage: React.FC = () => {
  const { 
    units, addUnit, deleteUnit, isLoadingUnits, errorUnits,
    recipeCategories, addRecipeCategory, updateRecipeCategory, deleteRecipeCategory, 
    isLoadingCategories, errorCategories, refreshCategories,
    persons, addPerson, updatePerson, deletePerson, isLoadingPersons, errorPersons, refreshPersons,
    archivedPlans, deleteArchivedPlan, isLoadingArchivedPlans, errorArchivedPlans, refreshArchivedPlans, // Removed restorePlan
    exportAllData, importAllData
  } = useData();
  
  const [newUnitName, setNewUnitName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<RecipeCategoryDB | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const [currentCategoryPrefix, setCurrentCategoryPrefix] = useState<string | number>('');
  const [categoryFormError, setCategoryFormError] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [currentPersonName, setCurrentPersonName] = useState('');
  const [personFormError, setPersonFormError] = useState('');
  const [isSubmittingPerson, setIsSubmittingPerson] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    refreshArchivedPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed dependency to empty array to fetch only on mount

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setIsAddingUnit(true);
    const success = await addUnit(newUnitName.trim());
    if (success) setNewUnitName('');
    setIsAddingUnit(false);
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę jednostkę?")) {
      await deleteUnit(unitId);
    }
  };

  const openNewCategoryModal = () => {
    setCategoryToEdit(null); setCurrentCategoryName(''); setCurrentCategoryPrefix('');
    setCategoryFormError(''); setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: RecipeCategoryDB) => {
    setCategoryToEdit(category); setCurrentCategoryName(category.name); setCurrentCategoryPrefix(category.prefix);
    setCategoryFormError(''); setIsCategoryModalOpen(true);
  };

  const handleCategoryFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setCategoryFormError('');
    if (!currentCategoryName.trim()) { setCategoryFormError('Nazwa kategorii jest wymagana.'); return; }
    if (currentCategoryPrefix === '' || isNaN(Number(currentCategoryPrefix)) || Number(currentCategoryPrefix) <= 0) {
      setCategoryFormError('Prefiks musi być dodatnią liczbą.'); return;
    }
    setIsSubmittingCategory(true);
    const payload = { name: currentCategoryName.trim(), prefix: Number(currentCategoryPrefix) };
    try {
      let success = categoryToEdit ? await updateRecipeCategory({ ...payload, id: categoryToEdit.id }) : await addRecipeCategory(payload);
      if (success) { setIsCategoryModalOpen(false); await refreshCategories(); } 
    } finally { setIsSubmittingCategory(false); }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę kategorię? Przepisy stracą powiązanie z nią.")) {
      await deleteRecipeCategory(categoryId); 
      await refreshCategories(); 
    }
  };

  const openNewPersonModal = () => {
    setPersonToEdit(null); setCurrentPersonName('');
    setPersonFormError(''); setIsPersonModalOpen(true);
  };

  const openEditPersonModal = (person: Person) => {
    setPersonToEdit(person); setCurrentPersonName(person.name);
    setPersonFormError(''); setIsPersonModalOpen(true);
  };

  const handlePersonFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setPersonFormError('');
    if (!currentPersonName.trim()) { setPersonFormError('Nazwa osoby jest wymagana.'); return; }
    setIsSubmittingPerson(true);
    try {
      let success = personToEdit ? await updatePerson(personToEdit.id, currentPersonName.trim()) : await addPerson(currentPersonName.trim());
      if (success) { setIsPersonModalOpen(false); await refreshPersons(); } 
    } finally { setIsSubmittingPerson(false); }
  };

  const handleDeletePerson = async (personId: string, personName: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć osobę "${personName}"? Zostanie ona również usunięta ze wszystkich przepisów i zaplanowanych posiłków.`)) {
      await deletePerson(personId); 
      await refreshPersons(); 
    }
  };

  const handleDeleteArchivedPlan = async (planId: string, planName: string) => {
      if (window.confirm(`Czy na pewno chcesz usunąć zarchiwizowany plan "${planName}"? Tej operacji nie można cofnąć.`)) {
          await deleteArchivedPlan(planId);
      }
  };

  const downloadJson = (data: object, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    const dataToExport = await exportAllData();
    setIsExporting(false);
    if (dataToExport) {
      downloadJson(dataToExport, `planer-posilkow-export-${new Date().toISOString().split('T')[0]}.json`);
      alert("Dane zostały pomyślnie wyeksportowane.");
    } else {
      alert("Wystąpił błąd podczas eksportu danych.");
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Nie udało się odczytać pliku.");
        const jsonData = JSON.parse(text) as FullExportData;
        
        // Basic validation of the JSON structure
        if (!jsonData || typeof jsonData !== 'object' || 
            !jsonData.recipeCategories || !jsonData.units || !jsonData.persons || 
            !jsonData.recipes || !jsonData.plannedMeals) {
            throw new Error("Plik JSON ma nieprawidłową strukturę lub brakuje wymaganych pól.");
        }

        const success = await importAllData(jsonData);
        if (success) {
            // Optionally, clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
      } catch (err) {
        console.error("Błąd importu:", err);
        alert(`Błąd importu: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsImporting(false);
         if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Ensure file input is cleared
        }
      }
    };
    reader.onerror = () => {
      alert("Nie udało się odczytać pliku.");
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Ustawienia</h1>

      {/* Zarządzanie jednostkami */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Zarządzaj Jednostkami</h2>
        {errorUnits && <p className="text-red-500 text-sm mb-2">Błąd ładowania jednostek: {errorUnits.message}</p>}
        <form onSubmit={handleAddUnit} className="flex gap-2 mb-4">
          <Input
            containerClassName="flex-grow mb-0"
            placeholder="Np. g, ml, sztuka"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            disabled={isAddingUnit || isLoadingUnits}
          />
          <Button type="submit" variant="primary" size="md" isLoading={isAddingUnit || isLoadingUnits} disabled={isAddingUnit || isLoadingUnits || !newUnitName.trim()}>
            <PlusIcon className="w-5 h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Dodaj</span>
          </Button>
        </form>
        {isLoadingUnits && <p>Ładowanie jednostek...</p>}
        {units.length > 0 && (
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {units.map(unit => (
              <li key={unit.id} className="flex justify-between items-center p-2 bg-slate-50 rounded hover:bg-slate-100">
                <span>{unit.name}</span>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(unit.id)} className="text-red-500 hover:text-red-700" aria-label={`Usuń jednostkę ${unit.name}`}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Zarządzanie kategoriami przepisów */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-3">Zarządzaj Kategoriami Przepisów</h2>
        {errorCategories && <p className="text-red-500 text-sm mb-2">Błąd ładowania kategorii: {errorCategories.message}</p>}
        <Button onClick={openNewCategoryModal} variant="primary" leftIcon={<PlusIcon />} className="mb-4" disabled={isLoadingCategories}>
          Dodaj Kategorię
        </Button>
        {isLoadingCategories && <p>Ładowanie kategorii...</p>}
        {recipeCategories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Prefiks</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nazwa</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {recipeCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700">{String(cat.prefix).padStart(3, '0')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700">{cat.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditCategoryModal(cat)} className="p-1" aria-label={`Edytuj kategorię ${cat.name}`}><EditIcon className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-red-500 hover:text-red-700" aria-label={`Usuń kategorię ${cat.name}`}><TrashIcon className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
       {isCategoryModalOpen && (
        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={categoryToEdit ? "Edytuj Kategorię" : "Dodaj Nową Kategorię"}>
          <form onSubmit={handleCategoryFormSubmit} className="space-y-4">
            <Input label="Nazwa kategorii" value={currentCategoryName} onChange={e => setCurrentCategoryName(e.target.value)} error={categoryFormError.includes("Nazwa") ? categoryFormError : undefined} required />
            <Input label="Prefiks (liczba)" type="number" value={currentCategoryPrefix} onChange={e => setCurrentCategoryPrefix(e.target.value)} error={categoryFormError.includes("Prefiks") ? categoryFormError : undefined} required />
            {categoryFormError && !categoryFormError.includes("Nazwa") && !categoryFormError.includes("Prefiks") && <p className="text-red-500 text-sm">{categoryFormError}</p>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Anuluj</Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingCategory}>{categoryToEdit ? "Zapisz Zmiany" : "Dodaj Kategorię"}</Button>
            </div>
          </form>
        </Modal>
      )}


      {/* Zarządzanie Osobami */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-3">Zarządzaj Osobami</h2>
        {errorPersons && <p className="text-red-500 text-sm mb-2">Błąd ładowania osób: {errorPersons.message}</p>}
        <Button onClick={openNewPersonModal} variant="primary" leftIcon={<PlusIcon />} className="mb-4" disabled={isLoadingPersons}>
          Dodaj Osobę
        </Button>
        {isLoadingPersons && <p>Ładowanie listy osób...</p>}
        {persons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nazwa Osoby</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {persons.map(person => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700">{person.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditPersonModal(person)} className="p-1" aria-label={`Edytuj osobę ${person.name}`}><EditIcon className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePerson(person.id, person.name)} className="p-1 text-red-500 hover:text-red-700" aria-label={`Usuń osobę ${person.name}`}><TrashIcon className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {isPersonModalOpen && (
        <Modal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} title={personToEdit ? "Edytuj Osobę" : "Dodaj Nową Osobę"}>
          <form onSubmit={handlePersonFormSubmit} className="space-y-4">
            <Input label="Nazwa osoby" value={currentPersonName} onChange={e => setCurrentPersonName(e.target.value)} error={personFormError} required />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={() => setIsPersonModalOpen(false)}>Anuluj</Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingPerson}>{personToEdit ? "Zapisz Zmiany" : "Dodaj Osobę"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Zarządzanie Zarchiwizowanymi Planami - tylko listowanie i usuwanie */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-3">Zarządzaj Zarchiwizowanymi Planami Posiłków</h2>
        {isLoadingArchivedPlans && <p>Ładowanie zarchiwizowanych planów...</p>}
        {errorArchivedPlans && <p className="text-red-500 text-sm mb-2">Błąd ładowania zarchiwizowanych planów: {errorArchivedPlans.message}</p>}
        {!isLoadingArchivedPlans && !errorArchivedPlans && archivedPlans.length === 0 && (
          <p className="text-slate-500">Brak zarchiwizowanych planów.</p>
        )}
        {archivedPlans.length > 0 && (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nazwa Archiwum</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Data Archiwizacji</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {archivedPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700">{plan.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{new Date(plan.archived_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right space-x-1">
                       <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteArchivedPlan(plan.id, plan.name)} 
                          className="p-1 text-red-500 hover:text-red-700"
                          leftIcon={<TrashIcon className="w-4 h-4"/>}
                          title={`Usuń archiwum ${plan.name}`}
                        >
                          <span className="hidden sm:inline">Usuń</span>
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      {/* Import / Export */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Zarządzanie Danymi (Import/Eksport)</h2>
        <div className="space-y-4">
            <div>
                <h3 className="text-md font-medium text-slate-600 mb-1">Eksportuj Wszystkie Dane</h3>
                <p className="text-sm text-slate-500 mb-2">Zapisz kopię zapasową wszystkich swoich danych (przepisy, plany, kategorie, osoby, jednostki, zarchiwizowane plany) do pliku JSON.</p>
                <Button onClick={handleExportData} variant="primary" isLoading={isExporting} disabled={isExporting || isImporting}>
                    Eksportuj Dane
                </Button>
            </div>
            <hr/>
            <div>
                <h3 className="text-md font-medium text-slate-600 mb-1">Importuj Dane z Pliku JSON</h3>
                <p className="text-sm text-slate-500 mb-2">
                    <strong className="text-red-600">Uwaga:</strong> Importowanie danych spowoduje <strong className="text-red-600">USUNIĘCIE WSZYSTKICH OBECNYCH DANYCH</strong> w aplikacji i zastąpienie ich danymi z pliku. 
                    Upewnij się, że plik pochodzi z tej aplikacji i jest prawidłowy.
                </p>
                <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportData} 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50"
                    ref={fileInputRef}
                    disabled={isImporting || isExporting}
                />
                {isImporting && <p className="text-sm text-sky-600 mt-2">Importowanie danych, proszę czekać...</p>}
            </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
