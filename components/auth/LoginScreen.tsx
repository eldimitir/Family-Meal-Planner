
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { ShoppingCartIcon } from '../../constants.tsx'; // Using an icon for visual appeal

const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading: authIsLoading } = useAuth(); // Renamed isLoading to avoid conflict

  const [isSubmitting, setIsSubmitting] = useState(false); // Local submitting state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Simulate a slight delay for UX
    setTimeout(() => {
      if (!login(password)) {
        setError('Nieprawidłowe hasło. Spróbuj ponownie.');
      }
      // No need to navigate here, AuthContext and ProtectedRoute will handle it.
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 p-4">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <div className="text-center mb-8">
          <ShoppingCartIcon className="w-16 h-16 text-sky-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800">Rodzinny Planer Posiłków</h1>
          <p className="text-slate-600 mt-2">Witaj! Podaj hasło, aby kontynuować.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Hasło"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wpisz hasło"
            error={error}
            autoFocus
            containerClassName="mb-6"
          />
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full"
            isLoading={isSubmitting || authIsLoading} // Combine loading states
            disabled={isSubmitting || authIsLoading}
          >
            Zaloguj się
          </Button>
        </form>
        <p className="text-xs text-slate-500 mt-6 text-center">
          Ta aplikacja przechowuje dane wyłącznie lokalnie w Twojej przeglądarce.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
    