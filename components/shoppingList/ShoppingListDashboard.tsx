
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { ShoppingListItem, RecipeCategory } from '../../types';
import { generateShoppingList } from '../../services/shoppingListService';
import ShoppingListItemComponent from './ShoppingListItemComponent';
import Button from '../ui/Button';
import { PrintIcon, TrashIcon, PlusIcon } from '../../constants.tsx';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { RECIPE_CATEGORIES_OPTIONS } from '../../constants';

const ShoppingListDashboard: React.FC = () => {
  const { weeklyPlan, recipes } = useData();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Partial<ShoppingListItem> | null>(null); // Can be partial for new item

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
    setItemToEdit({ name: '', quantity: '', unit: '', category: RecipeCategory.INNE, checked: false, recipeSources: ['Dodane ręcznie'] });
    setIsModalOpen(true);
  };
  
  // Basic edit - only allows editing name, quantity, unit of existing for now
  // A more robust edit for existing items generated from recipes might be complex
  // This is a placeholder for future enhancement or for manually added items.
  const openEditItemModal = (item: ShoppingListItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemToEdit || !itemToEdit.name || !itemToEdit.quantity) {
        alert("Nazwa i ilość są wymagane."); // Simple validation
        return;
    }

    if (itemToEdit.id) { // Editing existing
        setShoppingList(prev => prev.map(i => i.id === itemToEdit!.id ? itemToEdit as ShoppingListItem : i));
    } else { // Adding new
        setShoppingList(prev => [...prev, { ...itemToEdit, id: crypto.randomUUID() } as ShoppingListItem]);
    }
    setIsModalOpen(false);
    setItemToEdit(null);
  };


  const categories = Array.from(new Set(shoppingList.map(item => item.category || 'Inne')))
    .sort((a, b) => {
      const order = [...Object.values(RecipeCategory), 'Inne'];
      return order.indexOf(a as RecipeCategory) - order.indexOf(b as RecipeCategory);
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
          {categories.map(category => (
            <div key={category} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-sky-700 mb-3 border-b pb-2">{category}</h2>
              <div className="space-y-2">
                {shoppingList.filter(item => (item.category || 'Inne') === category).map(item => (
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
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} title={itemToEdit?.id ? "Edytuj Produkt" : "Dodaj Produkt Ręcznie"}>
        {itemToEdit && (
            <div className="space-y-4">
                <Input label="Nazwa produktu" value={itemToEdit.name || ''} onChange={e => setItemToEdit(prev => ({...prev!, name: e.target.value}))} />
                <Input label="Ilość" value={itemToEdit.quantity || ''} onChange={e => setItemToEdit(prev => ({...prev!, quantity: e.target.value}))} />
                <Input label="Jednostka" value={itemToEdit.unit || ''} onChange={e => setItemToEdit(prev => ({...prev!, unit: e.target.value}))} />
                <Select label="Kategoria (opcjonalnie)" 
                    options={[{value: "Inne", label:"Inne"}, ...RECIPE_CATEGORIES_OPTIONS]} 
                    value={itemToEdit.category || RecipeCategory.INNE} 
                    onChange={e => setItemToEdit(prev => ({...prev!, category: e.target.value as RecipeCategory | string}))} />
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
    