import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning';
}

interface ErrorContextType {
  showError: (message: string) => void;
  clearError: (id: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const showError = useCallback((message: string) => {
    const id = Math.random().toString(36).substring(7);
    setErrors((prev) => [...prev, { id, message, type: 'error' }]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setErrors((prev) => prev.filter((err) => err.id !== id));
    }, 6000);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((err) => err.id !== id));
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      <div className="fixed top-24 right-6 z-[110] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {errors.map((error) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto w-80 bg-rose-950/90 border border-rose-500/30 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex gap-4 items-start"
            >
              <div className="p-2 bg-rose-500/20 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">System Error</p>
                <p className="text-sm text-rose-100/80 leading-relaxed">{error.message}</p>
              </div>
              <button 
                onClick={() => clearError(error.id)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4 opacity-40 hover:opacity-100" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
