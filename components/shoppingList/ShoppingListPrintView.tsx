
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingListItem } from '../../types';
import { useData } from '../../contexts/DataContext'; // To get category order if needed

const ShoppingListPrintView: React.FC = () => {
  const location = useLocation();
  const { recipeCategories } = useData(); // For sorting categories
  const shoppingListForPrint: ShoppingListItem[] = location.state?.shoppingListForPrint || [];

  useEffect(() => {
    if (shoppingListForPrint.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shoppingListForPrint]);

  const categorizedList = useMemo(() => {
    const list: { [category: string]: ShoppingListItem[] } = {};
    shoppingListForPrint.forEach(item => {
      const category = item.category_name || 'Inne';
      if (!list[category]) {
        list[category] = [];
      }
      list[category].push(item);
    });
    return list;
  }, [shoppingListForPrint]);
  
  const sortedCategories = useMemo(() => {
    return Object.keys(categorizedList).sort((a, b) => {
      const findOrder = (catName: string) => recipeCategories.findIndex(rc => rc.name === catName);
      const orderA = findOrder(a);
      const orderB = findOrder(b);

      if (a === 'Inne') return 1; // 'Inne' always last
      if (b === 'Inne') return -1;

      if (orderA !== -1 && orderB !== -1) return orderA - orderB; // Sort by defined order
      return a.localeCompare(b); // Fallback to alphabetical
    });
  }, [categorizedList, recipeCategories]);


  if (shoppingListForPrint.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">Brak listy zakupów do wydrukowania.</p>
        <p className="mt-2 text-sm">Wróć i wygeneruj listę lub upewnij się, że została przekazana.</p>
      </div>
    );
  }

  return (
    <div className="print-container p-4 font-sans max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">Lista Zakupów</h1>
      
      {sortedCategories.map(category => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b-2 border-sky-500 pb-1 mb-2">{category}</h2>
          <ul className="list-none space-y-1">
            {categorizedList[category].map(item => (
              <li key={item.id} className="flex items-center py-1">
                <div className="w-6 h-6 border-2 border-slate-400 rounded-sm mr-3 flex-shrink-0"></div> {/* Checkbox placeholder */}
                <span className="text-slate-700 flex-grow">{item.name}</span>
                <span className="text-slate-600 ml-2 flex-shrink-0">({item.quantity} {item.unit})</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <footer className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
        Rodzinny Planer Posiłków - Lista Zakupów ({new Date().toLocaleDateString()})
      </footer>
    </div>
  );
};

export default ShoppingListPrintView;
