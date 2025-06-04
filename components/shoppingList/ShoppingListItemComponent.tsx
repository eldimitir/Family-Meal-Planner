
import React from 'react';
import { ShoppingListItem } from '../../types';
import Button from '../ui/Button';
import { TrashIcon } from '../../constants.tsx'; // Assuming EditIcon might be added later

interface ShoppingListItemProps {
  item: ShoppingListItem;
  onToggleChecked: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (item: ShoppingListItem) => void;
}

const ShoppingListItemComponent: React.FC<ShoppingListItemProps> = ({ item, onToggleChecked, onDeleteItem, onEditItem }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-md transition-colors duration-150 ${item.checked ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex items-center flex-grow mr-2 min-w-0"> {/* Added min-w-0 for better truncation */}
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggleChecked(item.id)}
          id={`item-${item.id}`} // Unique ID for label association
          className="h-5 w-5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 mr-3 cursor-pointer flex-shrink-0"
        />
        <label htmlFor={`item-${item.id}`} className="cursor-pointer flex-grow min-w-0"> {/* Added min-w-0 */}
          <span className={`font-medium block truncate ${item.checked ? 'line-through text-slate-500' : 'text-slate-700'}`} title={item.name}>
            {item.name}
          </span>
          <span className={`text-sm ${item.checked ? 'text-slate-400' : 'text-slate-500'}`}>
            ({item.quantity} {item.unit})
          </span>
          {item.recipeSources && item.recipeSources.length > 0 && (
            <p className="text-xs text-slate-400 truncate" title={`Z przepisów: ${item.recipeSources.join(', ')}`}>
              Przepisy: {item.recipeSources.join(', ').substring(0,50)}{item.recipeSources.join(', ').length > 50 ? '...' : ''}
            </p>
          )}
        </label>
      </div>
      <div className="flex-shrink-0 space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onEditItem(item)} className="p-1 text-slate-500 hover:text-slate-700" title="Edytuj produkt">
            {/* Using a simple 'E' for now, can be an icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)} className="p-1 text-red-500 hover:text-red-700" title="Usuń produkt">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListItemComponent;
