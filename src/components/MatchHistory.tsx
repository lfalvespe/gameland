import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { db, collection, query, where, orderBy, limit, getDocs, startAfter, OperationType, handleFirestoreError } from '../firebase';
import { cn } from '../lib/utils';

export const MatchHistory = () => {
  const { user } = useAuth();
  const { showError } = useError();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 5;

  const fetchMatches = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'matches'),
        where('players', 'array-contains', user.uid),
        where('mode', '==', 'online'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setMatches(newMatches);
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'matches', showError);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user?.uid]);

  return (
    <section className="bg-white/5 rounded-3xl border border-white/10 p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
        <h3 className="text-xl sm:text-2xl font-bold italic uppercase tracking-tighter">Últimas Partidas Online</h3>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center opacity-50">Carregando partidas...</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center opacity-30 italic font-medium">Nenhuma partida online encontrada.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {matches.map((match) => {
              const isWinner = match.winner === 'Draw' ? null : (
                match.winner === user?.uid || 
                match.winner === 'Player' ||
                (match.winner === 'X' && match.players?.[0] === user?.uid) || 
                (match.winner === 'O' && match.players?.[1] === user?.uid)
              );
              
              const gameName = 
                match.gameType === 'Tic-Tac-Toe' ? 'Jogo da Velha' : 
                match.gameType === 'Checkers' ? 'Damas' : 
                match.gameType === 'Hangman' ? 'Forca Batalha' : 
                match.gameType === 'Snakes-Ladders' ? 'Cobras e Escadas' :
                match.gameType === 'Ludo' ? 'Ludo' :
                match.gameType;

              const gameIcon = 
                match.gameType === 'Tic-Tac-Toe' ? '/icons/tic-tac-toe.png' : 
                match.gameType === 'Hangman' ? '/icons/forca-battle.png' :
                match.gameType === 'Ludo' ? '/icons/ludo.png' :
                match.gameType === 'Snakes-Ladders' ? '/icons/snakes-and-ladders.png' :
                '/icons/checkers.png';

              return (
                <div key={match.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center p-2",
                      match.gameType === 'Tic-Tac-Toe' ? "bg-blue-500/10 text-blue-400" : 
                      match.gameType === 'Hangman' ? "bg-purple-500/10 text-purple-400" :
                      match.gameType === 'Ludo' ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-rose-500/10 text-rose-400"
                    )}>
                      <img src={gameIcon} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt={match.gameType} />
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-blue-400 transition-colors uppercase tracking-tighter italic">{gameName}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">
                        {match.createdAt?.toDate ? match.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Agora'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      isWinner === true ? "text-green-400" : isWinner === false ? "text-rose-400" : "text-white/40"
                    )}>
                      {isWinner === true ? 'Vitória' : isWinner === false ? 'Derrota' : 'Empate'}
                    </p>
                    <p className="text-[10px] opacity-40 font-bold">+{match.score || 0} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
