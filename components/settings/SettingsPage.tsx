import React, { useState, useRef } from 'react';
import Card from '../ui/Card';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon, EditIcon } from '../../constants.tsx';
import { Unit, RecipeCategoryDB, ExportData } from '../../types';
import Modal from '../ui/Modal';

const SettingsPage: React.FC = () => {
  const { 
    units, addUnit, deleteUnit, isLoadingUnits, errorUnits,
    recipeCategories, addRecipeCategory, updateRecipeCategory, deleteRecipeCategory, 
    isLoadingCategories, errorCategories, refreshCategories,
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

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const openNewCategoryModal = () => {
    setCategoryToEdit(null);
    setCurrentCategoryName('');
    setCurrentCategoryPrefix('');
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: RecipeCategoryDB) => {
    setCategoryToEdit(category);
    setCurrentCategoryName(category.name);
    setCurrentCategoryPrefix(category.prefix);
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleCategoryFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFormError('');
    if (!currentCategoryName.trim()) {
      setCategoryFormError('Nazwa kategorii jest wymagana.');
      return;
    }
    if (currentCategoryPrefix === '' || isNaN(Number(currentCategoryPrefix)) || Number(currentCategoryPrefix) <= 0) {
      setCategoryFormError('Prefiks musi być dodatnią liczbą.');
      return;
    }

    setIsSubmittingCategory(true);
    const payload = { 
      name: currentCategoryName.trim(), 
      prefix: Number(currentCategoryPrefix) 
    };

    try {
      let success;
      if (categoryToEdit) {
        success = await updateRecipeCategory({ ...payload, id: categoryToEdit.id });
      } else {
        success = await addRecipeCategory(payload);
      }

      if (success) {
        setIsCategoryModalOpen(false);
        // refreshCategories(); // DataContext methods should handle refresh internally now
      }
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę kategorię? Przepisy w tej kategorii nie zostaną usunięte, ale stracą powiązanie z kategorią.")) {
      await deleteRecipeCategory(categoryId);
      // refreshCategories(); // DataContext methods should handle refresh
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    const data = await exportAllData();
    if (data) {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `rodzinny-planer-dane-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      link.remove();
    }
    setIsExporting(false);
  };

  const handleImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text) as ExportData;
      
      if (window.confirm("UWAGA: Importowanie danych spowoduje USUNIĘCIE wszystkich aktualnie istniejących danych (przepisów, kategorii, jednostek, planu posiłków) i zastąpienie ich danymi z pliku. Czy na pewno chcesz kontynuować?")) {
        const success = await importAllData(jsonData);
        if (success) {
          alert("Dane zostały pomyślnie zaimportowane.");
        } else {
         // Error alert handled by DataContext
        }
      }
    } catch (error) {
      console.error("Error processing import file:", error);
      alert(`Błąd podczas przetwarzania pliku importu: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    }
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Ustawienia</h1>
      
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Zarządzanie Danymi</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExportData} variant="primary" isLoading={isExporting} disabled={isExporting || isImporting}>
            Exportuj Dane (JSON)
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFileSelected} 
            accept=".json" 
            className="hidden" 
            id="import-file-input"
            disabled={isImporting || isExporting}
          />
          <Button 
            variant="secondary" 
            onClick={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            disabled={isImporting || isExporting}
          >
            Importuj Dane (JSON)
          </Button>
        </div>
         { (isImporting || isExporting) && <p className="text-sm text-sky-600 mt-2">{isImporting ? "Importowanie danych..." : "Eksportowanie danych..."}</p>}
         <p className="text-xs text-slate-500 mt-2">Eksport tworzy kopię zapasową wszystkich Twoich danych. Import zastępuje wszystkie istniejące dane danymi z pliku.</p>
      </Card>
      
      <Card>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sky-700">Zarządzanie Kategoriami Przepisów</h2>
            <Button onClick={openNewCategoryModal} variant="primary" size="sm" leftIcon={<PlusIcon />}>
                Dodaj kategorię
            </Button>
        </div>

        {isLoadingCategories && <p className="text-slate-500">Ładowanie kategorii...</p>}
        {errorCategories && <p className="text-red-500">Błąd ładowania kategorii: {errorCategories.message}</p>}
        
        {!isLoadingCategories && !errorCategories && recipeCategories.length === 0 && (
          <p className="text-slate-500">Brak zdefiniowanych kategorii. Dodaj pierwszą kategorię.</p>
        )}

        {!isLoadingCategories && recipeCategories.length > 0 && (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prefiks</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nazwa Kategorii</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {recipeCategories.map((cat: RecipeCategoryDB) => (
                  <tr key={cat.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{String(cat.prefix).padStart(3, '0')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{cat.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditCategoryModal(cat)}
                        leftIcon={<EditIcon className="w-4 h-4" />}
                        title="Edytuj kategorię"
                      >
                        <span className="hidden sm:inline">Edytuj</span>
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDeleteCategory(cat.id)}
                        leftIcon={<TrashIcon className="w-4 h-4" />}
                        title="Usuń kategorię"
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
              <thead className="bg-slate-50 sticky top-0">
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
                         title="Usuń jednostkę"
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
      
       <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Informacje o Aplikacji</h2>
        <p className="text-slate-600">
          <strong>Nazwa:</strong> Rodzinny Planer Posiłków
        </p>
        <p className="text-slate-600">
          <strong>Wersja:</strong> 1.3.0 (Demo)
        </p>
         <p className="text-slate-600 mt-2">
           Ta aplikacja została stworzona, aby pomóc w organizacji codziennego planowania posiłków.
        </p>
      </Card>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={categoryToEdit ? 'Edytuj Kategorię' : 'Dodaj Nową Kategorię'}>
        <form onSubmit={handleCategoryFormSubmit} className="space-y-4">
          <Input
            label="Nazwa kategorii"
            value={currentCategoryName}
            onChange={(e) => setCurrentCategoryName(e.target.value)}
            error={categoryFormError.includes('Nazwa') || (categoryFormError && !categoryFormError.includes('Prefiks')) ? categoryFormError : undefined}
            required
            disabled={isSubmittingCategory}
          />
          <Input
            label="Prefiks (numer)"
            type="number"
            value={String(currentCategoryPrefix)} 
            onChange={(e) => setCurrentCategoryPrefix(e.target.value)}
            error={categoryFormError.includes('Prefiks') ? categoryFormError : undefined}
            min="1"
            required
            disabled={isSubmittingCategory}
          />
          {categoryFormError && !categoryFormError.includes('Nazwa') && !categoryFormError.includes('Prefiks') && <p className="text-sm text-red-600">{categoryFormError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={isSubmittingCategory}>Anuluj</Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingCategory} disabled={isSubmittingCategory}>
              {categoryToEdit ? 'Zapisz zmiany' : 'Dodaj kategorię'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default SettingsPage;