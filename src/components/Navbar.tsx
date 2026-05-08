import React from 'react';
import { Gamepad2, Trophy, Users, LogOut, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { auth, signOut } from '../firebase';
import { cn } from '../lib/utils';

export const Navbar = ({ onViewProfile, onViewDashboard, pendingRequestsCount }: { onViewProfile: () => void, onViewDashboard: () => void, pendingRequestsCount: number }) => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 h-16 sm:h-[120px] px-4 sm:px-6 flex items-center justify-between border-b backdrop-blur-md",
      theme === 'cyberpunk' ? "border-yellow-400/30 bg-black/80" :
      theme === 'forest' ? "border-emerald-500/30 bg-emerald-950/80" :
      "border-white/10 bg-slate-900/80"
    )}>
      {/* Left: Brand Logo Text */}
      <div 
        className="flex items-center cursor-pointer group h-full"
        onClick={onViewDashboard}
      >
        <img 
          src="/brand/logo-text.png" 
          alt="GameLand" 
          className="h-full w-auto object-contain hover:scale-105 transition-transform" 
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Center: Rectangular Banner (Desktop Only for better density) */}
      <div className="absolute left-1/2 -translate-x-1/2 h-full py-1 pointer-events-none hidden lg:block">
        <img 
          src="/brand/rectangular-banner.png?v=3" 
          alt="GameLand Portal" 
          className="h-full w-auto object-contain" 
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <div className="hidden min-[450px]:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-xs sm:text-sm font-mono">{profile?.score || 0} PTS</span>
        </div>

        <button 
          onClick={toggleFullscreen}
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-white/70 group-hover:text-white" />
          ) : (
            <Maximize2 className="w-5 h-5 text-white/70 group-hover:text-white" />
          )}
        </button>

        <button 
          onClick={onViewDashboard}
          className="relative p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <Users className="w-5 h-5 text-white/70 group-hover:text-white" />
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={onViewProfile}
          >
            <div className="text-right hidden md:block">
              <div className="flex items-center justify-end gap-1.5">
                {profile?.role === 'admin' && <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Admin</span>}
                {profile?.role === 'moderator' && <span className="text-[8px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Mod</span>}
                <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{profile?.displayName}</p>
              </div>
              <p className="text-xs opacity-50">{profile?.city || 'Earth'}</p>
            </div>
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
              alt="Profile" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-500 group-hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
