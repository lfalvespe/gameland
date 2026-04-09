import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ErrorProvider } from './ErrorContext';
import GameLand from './GameLand';

export default function App() {
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
