import React from 'react';
import { ShoppingListItem } from '../../types';
import Button from '../ui/Button';
import { TrashIcon, EditIcon } from '../../constants.tsx'; 

interface ShoppingListItemProps {
  item: ShoppingListItem;
  onToggleChecked: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (item: ShoppingListItem) => void;
}

const ShoppingListItemComponent: React.FC<ShoppingListItemProps> = ({ item, onToggleChecked, onDeleteItem, onEditItem }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-md transition-colors duration-150 ${item.checked ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex items-center flex-grow mr-2 min-w-0"> 
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggleChecked(item.id)}
          id={`item-${item.id}`}
          className="h-5 w-5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 mr-3 cursor-pointer flex-shrink-0"
          aria-labelledby={`item-label-${item.id}`}
        />
        <label htmlFor={`item-${item.id}`} id={`item-label-${item.id}`} className="cursor-pointer flex-grow min-w-0">
          <span className={`font-medium block truncate ${item.checked ? 'line-through text-slate-500' : 'text-slate-700'}`} title={item.name}>
            {item.name}
          </span>
          {/* Display item.quantity directly as it should be self-contained e.g. "100 g", "1 szt." */}
          <span className={`text-sm ${item.checked ? 'text-slate-400' : 'text-slate-500'}`}>
            ({item.quantity})
          </span>
          {item.recipeSources && item.recipeSources.length > 0 && (
            <p className="text-xs text-slate-400 truncate" title={`Z przepisów: ${item.recipeSources.join(', ')}`}>
              Przepisy: {item.recipeSources.join(', ').substring(0,50)}{item.recipeSources.join(', ').length > 50 ? '...' : ''}
            </p>
          )}
        </label>
      </div>
      <div className="flex-shrink-0 space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onEditItem(item)} className="p-1 text-slate-500 hover:text-slate-700" title="Edytuj produkt" aria-label="Edytuj produkt">
            <EditIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)} className="p-1 text-red-500 hover:text-red-700" title="Usuń produkt" aria-label="Usuń produkt">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListItemComponent;
