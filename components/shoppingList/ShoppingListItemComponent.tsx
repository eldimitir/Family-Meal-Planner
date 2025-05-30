
import React from 'react';
import { ShoppingListItem } from '../../types';
import Button from '../ui/Button';
import { TrashIcon } from '../../constants.tsx';

interface ShoppingListItemProps {
  item: ShoppingListItem;
  onToggleChecked: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (item: ShoppingListItem) => void; // For manual editing
}

const ShoppingListItemComponent: React.FC<ShoppingListItemProps> = ({ item, onToggleChecked, onDeleteItem, onEditItem }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-md transition-colors duration-150 ${item.checked ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex items-center flex-grow mr-2">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggleChecked(item.id)}
          className="h-5 w-5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 mr-3 cursor-pointer"
        />
        <div onClick={() => onToggleChecked(item.id)} className="cursor-pointer flex-grow">
          <span className={`font-medium ${item.checked ? 'line-through text-slate-500' : 'text-slate-700'}`}>
            {item.name}
          </span>
          <span className={`ml-2 text-sm ${item.checked ? 'text-slate-400' : 'text-slate-500'}`}>
            ({item.quantity} {item.unit})
          </span>
          {item.recipeSources && item.recipeSources.length > 0 && (
            <p className="text-xs text-slate-400 truncate" title={item.recipeSources.join(', ')}>
              Przepisy: {item.recipeSources.join(', ').substring(0,50)}{item.recipeSources.join(', ').length > 50 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 space-x-1">
        {/* Placeholder for Edit Button. Actual edit functionality would require a modal or inline form */}
        <Button variant="ghost" size="sm" onClick={() => onEditItem(item)} className="p-1 text-slate-500 hover:text-slate-700" title="Edytuj (TODO)">
            E
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)} className="p-1 text-red-500 hover:text-red-700" title="Usuń">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ShoppingListItemComponent;
    