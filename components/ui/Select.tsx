
import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
  placeholder?: string; // Added placeholder prop
}

const Select: React.FC<SelectProps> = ({ 
  label, 
  name, 
  options, 
  error, 
  className, 
  containerClassName, 
  placeholder, // Destructured placeholder
  ...props 
}) => {
  return (
    <div className={`mb-4 ${containerClassName || ''}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        className={`block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md shadow-sm ${error ? 'border-red-500' : ''} ${className || ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
