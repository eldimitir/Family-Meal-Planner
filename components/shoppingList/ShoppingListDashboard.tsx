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

const ShoppingListDashboard: React.FC = () => {
  const { weeklyPlan, recipes, recipeCategories, isLoadingCategories, units, getAllIngredientNames } = useData();
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
    if (shoppingList.length === 0) {
        alert("Lista zakupów jest pusta. Nie ma czego drukować.");
        return;
    }
    // Sort the list alphabetically by name before sending to print view
    const sortedList = [...shoppingList].sort((a, b) => a.name.localeCompare(b.name));
    navigate('/lista-zakupow/drukuj', { state: { shoppingListForPrint: sortedList } });
  };
  
  const handleClearList = () => {
     if (window.confirm("Czy na pewno chcesz wyczyścić całą listę zakupów? Tej operacji nie można cofnąć.")) {
        setShoppingList([]);
    }
  };

  const openAddItemModal = () => {
    setItemToEdit({ 
        name: '', 
        quantity: '', 
        unit: '', 
        // No default category_id for shopping list item, will be "Inne" effectively
        category_id: null, 
        category_name: 'Inne', // Default for manually added items
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
    if (!itemToEdit || !itemToEdit.name?.trim() || !itemToEdit.quantity?.trim()) {
        alert("Nazwa i ilość są wymagane.");
        return;
    }
    
    let finalItemData = { ...itemToEdit };
    // For shopping list, category is not a primary concern for display, but good for data.
    // If category_id exists, ensure category_name is consistent. Otherwise, 'Inne'.
    if (finalItemData.category_id) {
        const cat = recipeCategories.find(c => c.id === finalItemData.category_id);
        finalItemData.category_name = cat ? cat.name : 'Inne';
    } else {
        finalItemData.category_name = 'Inne'; 
    }

    if (finalItemData.quantity && finalItemData.unit && !finalItemData.quantity.toLowerCase().includes(finalItemData.unit.toLowerCase())) {
        finalItemData.quantity = `${finalItemData.quantity.trim()} ${finalItemData.unit.trim()}`;
    }

    if (itemToEdit.id && itemToEdit.id !== crypto.randomUUID() && shoppingList.some(i => i.id === itemToEdit.id)) { 
        setShoppingList(prev => prev.map(i => i.id === finalItemData!.id ? finalItemData as ShoppingListItem : i));
    } else { 
        setShoppingList(prev => [...prev, { ...finalItemData, id: crypto.randomUUID() } as ShoppingListItem]);
    }
    setIsModalOpen(false);
    setItemToEdit(null);
  };

  // Categories are now only for the modal, not for display grouping
  const modalCategoryOptions = useMemo(() => {
    return [
        { value: "", label: "Brak (Inne)"}, 
        ...recipeCategories.map(cat => ({ value: cat.id, label: cat.name }))
    ];
  }, [recipeCategories]);

  const availableUnitsForDatalist = useMemo(() => units.map(u => u.name), [units]);
  const availableIngredientNamesForDatalist = useMemo(() => getAllIngredientNames(), [getAllIngredientNames]);

  const sortedShoppingList = useMemo(() => {
    return [...shoppingList].sort((a, b) => a.name.localeCompare(b.name));
  }, [shoppingList]);

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
          <Button onClick={handlePrintList} variant="primary" size="sm" leftIcon={<PrintIcon />} disabled={shoppingList.length === 0}>
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
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-sky-700 mb-3 border-b pb-2">Wszystkie Produkty</h2>
          <div className="space-y-2">
            {sortedShoppingList.map(item => (
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
      )}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} title={itemToEdit?.id && shoppingList.some(i => i.id === itemToEdit.id) ? "Edytuj Produkt" : "Dodaj Produkt Ręcznie"}>
        {itemToEdit && (
            <div className="space-y-4">
                <Input 
                    label="Nazwa produktu" 
                    value={itemToEdit.name || ''} 
                    onChange={e => setItemToEdit(prev => ({...prev!, name: e.target.value}))} 
                    required 
                    list="shoppinglist-item-names"
                />
                <Input 
                    label="Ilość (np. 100, 1 opakowanie)" 
                    value={itemToEdit.quantity || ''} 
                    onChange={e => setItemToEdit(prev => ({...prev!, quantity: e.target.value}))} 
                    required 
                />
                <Input 
                    label="Jednostka (np. g, szt, ml) - opcjonalnie, jeśli nie w ilości" 
                    value={itemToEdit.unit || ''} 
                    onChange={e => setItemToEdit(prev => ({...prev!, unit: e.target.value}))} 
                    list="shoppinglist-item-units"
                />
                 {/* Category for shopping list items is not used for display grouping anymore, but can be kept for data consistency if needed */}
                {/* <Select 
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
                /> */}
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => { setIsModalOpen(false); setItemToEdit(null); }}>Anuluj</Button>
                    <Button variant="primary" onClick={handleSaveItem}>Zapisz</Button>
                </div>
            </div>
        )}
      </Modal>
      <datalist id="shoppinglist-item-units">
        {availableUnitsForDatalist.map(unitName => <option key={unitName} value={unitName} />)}
      </datalist>
      <datalist id="shoppinglist-item-names">
        {availableIngredientNamesForDatalist.map(name => <option key={name} value={name} />)}
      </datalist>
    </div>
  );
};

export default ShoppingListDashboard;
