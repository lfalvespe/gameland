import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'classic' | 'cyberpunk' | 'forest';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'classic',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<Theme>('classic');

  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile]);

  useEffect(() => {
    document.documentElement.classList.remove('classic', 'cyberpunk', 'forest');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`min-h-screen transition-colors duration-500 ${
        theme === 'cyberpunk' ? 'bg-black text-yellow-400' : 
        theme === 'forest' ? 'bg-emerald-950 text-emerald-50' : 
        'bg-slate-900 text-white'
      }`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
