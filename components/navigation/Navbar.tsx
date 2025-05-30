
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import { LogoutIcon, ListBulletIcon, CalendarDaysIcon, ShoppingCartIcon, CogIcon } from '../../constants.tsx';

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, children, icon, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
       ${isActive ? 'bg-sky-700 text-white' : 'text-slate-100 hover:bg-sky-500 hover:text-white'}`
    }
  >
    <span className="mr-2">{icon}</span>
    {children}
  </NavLink>
);

const Navbar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: "/przepisy", label: "Przepisy", icon: <ListBulletIcon className="w-5 h-5"/> },
    { to: "/planer", label: "Planer", icon: <CalendarDaysIcon className="w-5 h-5"/> },
    { to: "/lista-zakupow", label: "Lista Zakupów", icon: <ShoppingCartIcon className="w-5 h-5"/> },
    { to: "/ustawienia", label: "Ustawienia", icon: <CogIcon className="w-5 h-5"/> },
  ];

  return (
    <nav className="no-print bg-sky-600 shadow-md fixed w-full z-40 top-0 left-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 text-white font-bold text-xl hover:opacity-80 transition-opacity">
              Planer Posiłków
            </NavLink>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map(link => (
                <NavItem key={link.to} to={link.to} icon={link.icon}>
                  {link.label}
                </NavItem>
              ))}
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-100 hover:bg-sky-500 hover:text-white" leftIcon={<LogoutIcon className="w-5 h-5"/>}>
                Wyloguj
              </Button>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-sky-100 hover:text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Otwórz menu główne</span>
              {!mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
                <NavItem key={link.to} to={link.to} icon={link.icon} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </NavItem>
              ))}
            <Button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} variant="ghost" size="sm" className="text-slate-100 hover:bg-sky-500 hover:text-white w-full justify-start mt-2" leftIcon={<LogoutIcon className="w-5 h-5"/>}>
              Wyloguj
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
    