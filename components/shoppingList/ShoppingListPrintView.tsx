import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingListItem } from '../../types';

const ShoppingListPrintView: React.FC = () => {
  const location = useLocation();
  // shoppingListForPrint should already be sorted by name from ShoppingListDashboard
  const shoppingListForPrint: ShoppingListItem[] = location.state?.shoppingListForPrint || [];

  useEffect(() => {
    if (shoppingListForPrint.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shoppingListForPrint]);

  if (shoppingListForPrint.length === 0) {
    return (
      <div className="p-8 text-center print-container">
        <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">Lista Zakupów</h1>
        <p className="text-xl">Brak listy zakupów do wydrukowania.</p>
        <p className="mt-2 text-sm">Wróć i wygeneruj listę lub upewnij się, że została przekazana.</p>
        <button onClick={() => window.history.back()} className="mt-4 p-2 bg-slate-200 rounded no-print">Wróć</button>
      </div>
    );
  }

  return (
    <div className="print-container p-4 font-sans max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">Lista Zakupów</h1>
      
      <div className="mb-6">
        {/* <h2 className="text-lg font-semibold text-slate-800 border-b-2 border-sky-500 pb-1 mb-2">Wszystkie Produkty</h2> */}
        <ul className="list-none space-y-1">
          {shoppingListForPrint.map(item => (
            <li key={item.id} className="flex items-center py-1">
              <div className="w-6 h-6 border-2 border-slate-400 rounded-sm mr-3 flex-shrink-0"></div> {/* Checkbox placeholder */}
              <span className="text-slate-700 flex-grow">{item.name}</span>
              {/* item.quantity should already contain the unit, e.g., "100 g" */}
              <span className="text-slate-600 ml-2 flex-shrink-0">({item.quantity})</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
        Rodzinny Planer Posiłków - Lista Zakupów ({new Date().toLocaleDateString()})
      </footer>
    </div>
  );
};

export default ShoppingListPrintView;
