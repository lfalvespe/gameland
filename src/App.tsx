import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ErrorProvider } from './ErrorContext';
import GameLand from './GameLand';

export default function App() {
  React.useEffect(() => {
    const triggerFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Ignore failures (e.g. user denied or browser blocked)
        });
      }
      // Remove after first success or attempt
      window.removeEventListener('click', triggerFullscreen);
    };

    window.addEventListener('click', triggerFullscreen);
    return () => window.removeEventListener('click', triggerFullscreen);
  }, []);

  return (
    <AuthProvider>
      <ErrorProvider>
        <ThemeProvider>
          <GameLand />
        </ThemeProvider>
      </ErrorProvider>
    </AuthProvider>
  );
}
