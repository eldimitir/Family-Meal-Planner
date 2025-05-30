import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const getStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  useEffect(() => {
    setStoredValue(getStoredValue());
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Rerun if key changes, e.g. user logs out and key is nulled or context changes

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;