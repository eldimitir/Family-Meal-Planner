
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { ShoppingListItem, RecipeCategoryDB } from '../../types';
import { generateShoppingList } from '../../services/shoppingListService';
import ShoppingListItemComponent from './ShoppingListItemComponent';
import Button from '../ui/Button';
import { PrintIcon, TrashIcon, PlusIcon } from '../../constants.tsx';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
// RECIPE_CATEGORIES_OPTIONS is removed, we'll use fetched categories

const ShoppingListDashboard: React.FC = () => {
  const { weeklyPlan, recipes, recipeCategories, isLoadingCategories } = useData(); // Added recipeCategories
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Partial<ShoppingListItem> | null>(null);

  const navigate = useNavigate();

  const regenerateList = useCallback(() => {
    const newList = generateShoppingList(weeklyPlan, recipes);
    setShoppingList(newList);
  }, [weeklyPlan, recipes]);

  useEffect(() => {
    regenerateList();
  }, [regenerateList]);

  const handleToggleChecked = (itemId: string) => {
    setShoppingList(prevList =>
      prevList.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten produkt z listy?")) {
        setShoppingList(prevList => prevList.filter(item => item.id !== itemId));
    }
  };

  const handlePrintList = () => {
    navigate('/lista-zakupow/drukuj', { state: { shoppingListForPrint: shoppingList } });
  };
  
  const handleClearList = () => {
     if (window.confirm("Czy na pewno chcesz wyczyścić całą listę zakupów? Tej operacji nie można cofnąć.")) {
        setShoppingList([]);
    }
  };

  const openAddItemModal = () => {
    const defaultCategory = recipeCategories.length > 0 ? recipeCategories[0] : null;
    setItemToEdit({ 
        name: '', 
        quantity: '', 
        unit: '', 
        category_id: defaultCategory?.id || null, 
        category_name: defaultCategory?.name || 'Inne',
        checked: false, 
        recipeSources: ['Dodane ręcznie'] 
    });
    setIsModalOpen(true);
  };
  
  const openEditItemModal = (item: ShoppingListItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemToEdit || !itemToEdit.name || !itemToEdit.quantity) {
        alert("Nazwa i ilość są wymagane.");
        return;
    }
    
    // Ensure category_name is set if category_id is present
    let finalItemData = { ...itemToEdit };
    if (finalItemData.category_id) {
        const cat = recipeCategories.find(c => c.id === finalItemData.category_id);
        finalItemData.category_name = cat ? cat.name : 'Inne';
    } else {
        finalItemData.category_name = 'Inne'; // Default if no category_id
    }


    if (itemToEdit.id && itemToEdit.id !== crypto.randomUUID()) { // Editing existing (check if ID is not a placeholder)
        setShoppingList(prev => prev.map(i => i.id === finalItemData!.id ? finalItemData as ShoppingListItem : i));
    } else { // Adding new
        setShoppingList(prev => [...prev, { ...finalItemData, id: crypto.randomUUID() } as ShoppingListItem]);
    }
    setIsModalOpen(false);
    setItemToEdit(null);
  };

  const modalCategoryOptions = useMemo(() => {
    return [
        { value: "", label: "Brak (Inne)"}, // Option for no category or general
        ...recipeCategories.map(cat => ({ value: cat.id, label: cat.name }))
    ];
  }, [recipeCategories]);


  const categoriesForDisplay = Array.from(new Set(shoppingList.map(item => item.category_name || 'Inne')))
    .sort((a, b) => {
        // Attempt to sort by original category order if possible, otherwise alphabetically
        const findOrder = (catName: string) => recipeCategories.findIndex(rc => rc.name === catName);
        const orderA = findOrder(a);
        const orderB = findOrder(b);

        if (orderA !== -1 && orderB !== -1) return orderA - orderB;
        if (orderA !== -1) return -1; // Known categories first
        if (orderB !== -1) return 1;
        return a.localeCompare(b); // Fallback to alphabetical for "Inne" or unknown
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Lista Zakupów</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openAddItemModal} variant="secondary" size="sm" leftIcon={<PlusIcon />}>
            Dodaj produkt
          </Button>
          <Button onClick={regenerateList} variant="secondary" size="sm">Odśwież listę</Button>
          <Button onClick={handleClearList} variant="danger" size="sm" leftIcon={<TrashIcon />}>
            Wyczyść listę
          </Button>
          <Button onClick={handlePrintList} variant="primary" size="sm" leftIcon={<PrintIcon />}>
            Drukuj listę
          </Button>
        </div>
      </div>

      {shoppingList.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-xl text-slate-500">Twoja lista zakupów jest pusta.</p>
          <p className="text-slate-400 mt-2">Zaplanuj posiłki, aby automatycznie wygenerować listę, lub dodaj produkty ręcznie.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categoriesForDisplay.map(categoryName => (
            <div key={categoryName} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-sky-700 mb-3 border-b pb-2">{categoryName}</h2>
              <div className="space-y-2">
                {shoppingList.filter(item => (item.category_name || 'Inne') === categoryName).map(item => (
                  <ShoppingListItemComponent
                    key={item.id}
                    item={item}
                    onToggleChecked={handleToggleChecked}
                    onDeleteItem={handleDeleteItem}
                    onEditItem={openEditItemModal}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} title={itemToEdit?.id && itemToEdit.id !== crypto.randomUUID() ? "Edytuj Produkt" : "Dodaj Produkt Ręcznie"}>
        {itemToEdit && (
            <div className="space-y-4">
                <Input label="Nazwa produktu" value={itemToEdit.name || ''} onChange={e => setItemToEdit(prev => ({...prev!, name: e.target.value}))} required />
                <Input label="Ilość" value={itemToEdit.quantity || ''} onChange={e => setItemToEdit(prev => ({...prev!, quantity: e.target.value}))} required />
                <Input label="Jednostka" value={itemToEdit.unit || ''} onChange={e => setItemToEdit(prev => ({...prev!, unit: e.target.value}))} />
                <Select 
                    label="Kategoria (opcjonalnie)" 
                    options={modalCategoryOptions} 
                    value={itemToEdit.category_id || ""} 
                    onChange={e => {
                        const selectedCatId = e.target.value;
                        const selectedCat = recipeCategories.find(cat => cat.id === selectedCatId);
                        setItemToEdit(prev => ({
                            ...prev!, 
                            category_id: selectedCatId || null,
                            category_name: selectedCat ? selectedCat.name : 'Inne'
                        }));
                    }}
                    disabled={isLoadingCategories}
                    placeholder={isLoadingCategories ? "Ładowanie..." : "Wybierz kategorię"}
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => { setIsModalOpen(false); setItemToEdit(null); }}>Anuluj</Button>
                    <Button variant="primary" onClick={handleSaveItem}>Zapisz</Button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default ShoppingListDashboard;
