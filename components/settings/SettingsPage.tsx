import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { useData } from '../../contexts/DataContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PlusIcon, TrashIcon, EditIcon } from '../../constants.tsx';
import { Unit, RecipeCategoryDB, Person } from '../../types';
import Modal from '../ui/Modal';

const SettingsPage: React.FC = () => {
  const { 
    units, addUnit, deleteUnit, isLoadingUnits, errorUnits,
    recipeCategories, addRecipeCategory, updateRecipeCategory, deleteRecipeCategory, 
    isLoadingCategories, errorCategories, refreshCategories,
    persons, addPerson, updatePerson, deletePerson, isLoadingPersons, errorPersons, refreshPersons
  } = useData();
  
  // Unit Management State
  const [newUnitName, setNewUnitName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<RecipeCategoryDB | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const [currentCategoryPrefix, setCurrentCategoryPrefix] = useState<string | number>('');
  const [categoryFormError, setCategoryFormError] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Person Management State
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [currentPersonName, setCurrentPersonName] = useState('');
  const [personFormError, setPersonFormError] = useState('');
  const [isSubmittingPerson, setIsSubmittingPerson] = useState(false);


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
      if (success) { setIsCategoryModalOpen(false); refreshCategories(); }
    } finally { setIsSubmittingCategory(false); }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę kategorię? Przepisy stracą powiązanie z nią.")) {
      await deleteRecipeCategory(categoryId); refreshCategories();
    }
  };

  // Person Management Functions
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
      if (success) { setIsPersonModalOpen(false); refreshPersons(); }
      // Error alerts are handled in DataContext for unique name constraint
    } finally { setIsSubmittingPerson(false); }
  };

  const handleDeletePerson = async (personId: string, personName: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć osobę "${personName}"? Zostanie ona również usunięta ze wszystkich przepisów i zaplanowanych posiłków.`)) {
      await deletePerson(personId); 
      refreshPersons(); // DataContext handles refreshing related data (recipes, planner)
    }
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Ustawienia</h1>
      
      {/* Person Management Card */}
      <Card>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sky-700">Zarządzanie Osobami</h2>
            <Button onClick={openNewPersonModal} variant="primary" size="sm" leftIcon={<PlusIcon />}>
                Dodaj osobę
            </Button>
        </div>
        {isLoadingPersons && <p className="text-slate-500">Ładowanie osób...</p>}
        {errorPersons && <p className="text-red-500">Błąd ładowania osób: {errorPersons.message}</p>}
        {!isLoadingPersons && !errorPersons && persons.length === 0 && (
          <p className="text-slate-500">Brak zdefiniowanych osób. Dodaj pierwszą osobę.</p>
        )}
        {!isLoadingPersons && persons.length > 0 && (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nazwa Osoby</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {persons.map((person: Person) => (
                  <tr key={person.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{person.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                       <Button 
                        variant="ghost" size="sm" onClick={() => openEditPersonModal(person)}
                        leftIcon={<EditIcon className="w-4 h-4" />} title="Edytuj osobę"
                      >
                        <span className="hidden sm:inline">Edytuj</span>
                      </Button>
                      <Button 
                        variant="danger" size="sm" onClick={() => handleDeletePerson(person.id, person.name)}
                        leftIcon={<TrashIcon className="w-4 h-4" />} title="Usuń osobę"
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

      {/* Category Management Card */}
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
          <p className="text-slate-500">Brak zdefiniowanych kategorii.</p>
        )}
        {!isLoadingCategories && recipeCategories.length > 0 && (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
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
                       <Button variant="ghost" size="sm" onClick={() => openEditCategoryModal(cat)} leftIcon={<EditIcon className="w-4 h-4" />} title="Edytuj kategorię" >
                        <span className="hidden sm:inline">Edytuj</span></Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(cat.id)} leftIcon={<TrashIcon className="w-4 h-4" />} title="Usuń kategorię" >
                         <span className="hidden sm:inline">Usuń</span></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Unit Management Card */}
      <Card>
        <h2 className="text-xl font-semibold text-sky-700 mb-4">Zarządzanie Jednostkami Miar</h2>
        <form onSubmit={handleAddUnit} className="flex items-end gap-2 mb-6">
          <Input
            label="Nazwa nowej jednostki" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)}
            placeholder="np. sztuka, gram, ml" containerClassName="flex-grow mb-0" disabled={isAddingUnit}
          />
          <Button type="submit" variant="primary" leftIcon={<PlusIcon />} isLoading={isAddingUnit} disabled={isAddingUnit || !newUnitName.trim()}>
            Dodaj
          </Button>
        </form>
        {isLoadingUnits && <p className="text-slate-500">Ładowanie jednostek...</p>}
        {errorUnits && <p className="text-red-500">Błąd ładowania jednostek: {errorUnits.message}</p>}
        {!isLoadingUnits && !errorUnits && units.length === 0 && (
          <p className="text-slate-500">Brak zdefiniowanych jednostek.</p>
        )}
        {!isLoadingUnits && units.length > 0 && (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nazwa Jednostki</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {units.map((unit: Unit) => (
                  <tr key={unit.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{unit.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="danger" size="sm" onClick={() => handleDeleteUnit(unit.id)} leftIcon={<TrashIcon className="w-4 h-4" />} title="Usuń jednostkę">
                         <span className="hidden sm:inline">Usuń</span></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card><h2 className="text-xl font-semibold text-sky-700 mb-4">Informacje o Aplikacji</h2>
        <p className="text-slate-600"><strong>Nazwa:</strong> Rodzinny Planer Posiłków</p>
        <p className="text-slate-600"><strong>Wersja:</strong> 1.3.0 (Demo)</p>
      </Card>

      {/* Category Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={categoryToEdit ? 'Edytuj Kategorię' : 'Dodaj Nową Kategorię'}>
        <form onSubmit={handleCategoryFormSubmit} className="space-y-4">
          <Input label="Nazwa kategorii" value={currentCategoryName} onChange={(e) => setCurrentCategoryName(e.target.value)} error={categoryFormError.includes('Nazwa') ? categoryFormError : undefined} required disabled={isSubmittingCategory} />
          <Input label="Prefiks (numer)" type="number" value={String(currentCategoryPrefix)} onChange={(e) => setCurrentCategoryPrefix(e.target.value)} error={categoryFormError.includes('Prefiks') ? categoryFormError : undefined} min="1" required disabled={isSubmittingCategory} />
          {categoryFormError && !categoryFormError.includes('Nazwa') && !categoryFormError.includes('Prefiks') && <p className="text-sm text-red-600">{categoryFormError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={isSubmittingCategory}>Anuluj</Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingCategory} disabled={isSubmittingCategory}>
              {categoryToEdit ? 'Zapisz zmiany' : 'Dodaj kategorię'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Person Modal */}
      <Modal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} title={personToEdit ? 'Edytuj Osobę' : 'Dodaj Nową Osobę'}>
        <form onSubmit={handlePersonFormSubmit} className="space-y-4">
          <Input label="Nazwa osoby" value={currentPersonName} onChange={(e) => setCurrentPersonName(e.target.value)} error={personFormError} required disabled={isSubmittingPerson} />
          {personFormError && <p className="text-sm text-red-600">{personFormError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsPersonModalOpen(false)} disabled={isSubmittingPerson}>Anuluj</Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPerson} disabled={isSubmittingPerson}>
              {personToEdit ? 'Zapisz zmiany' : 'Dodaj osobę'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default SettingsPage;
