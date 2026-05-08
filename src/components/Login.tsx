import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

export const Login = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#0f172a_100%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-12 text-center shadow-2xl"
      >
        <div className="mb-12">
          <img 
            src="/brand/logo-text.png" 
            alt="GameLand" 
            className="w-full max-w-[280px] mx-auto object-contain" 
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-lg opacity-60 mb-12">O portal definitivo de jogos sociais. Compita, converse e suba no ranking.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full py-4 px-8 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Entrar com o Google
        </button>
        
        <p className="mt-8 text-xs opacity-30 uppercase tracking-widest">Junte-se a mais de 10.000 jogadores</p>
      </motion.div>
    </div>
  );
};
