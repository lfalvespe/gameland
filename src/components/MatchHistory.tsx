import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { db, collection, query, where, orderBy, limit, getDocs, startAfter, OperationType, handleFirestoreError } from '../firebase';
import { cn } from '../lib/utils';

export const MatchHistory = () => {
  const { user } = useAuth();
  const { showError } = useError();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const fetchMatches = async (isNext = false) => {
    if (!user) return;
    setLoading(true);
    try {
      let q = query(
        collection(db, 'matches'),
        where('players', 'array-contains', user.uid),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setMatches(newMatches);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'matches', showError);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  const handleNext = () => {
    setPage(p => p + 1);
    fetchMatches(true);
  };

  const handlePrev = () => {
    setPage(1);
    fetchMatches();
  };

  return (
    <div className="mt-12 w-full text-left">
      <h3 className="text-xs font-bold uppercase tracking-widest opacity-30 mb-4 px-2">Match History</h3>
      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center opacity-50">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center opacity-30 italic">No matches played yet.</div>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {matches.map((match) => {
                const isWinner = match.winner === 'Draw' ? null : (
                  match.winner === user.uid || 
                  match.winner === 'Player' ||
                  (match.winner === 'X' && match.players[0] === user.uid) || 
                  (match.winner === 'O' && match.players[1] === user.uid)
                );
                const opponentId = match.players.find((id: string) => id !== user.uid);
                
                return (
                  <div key={match.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                        isWinner === true ? "bg-green-500/20 text-green-400" : 
                        isWinner === false ? "bg-rose-500/20 text-rose-400" : 
                        "bg-white/10 text-white/40"
                      )}>
                        {isWinner === true ? 'W' : isWinner === false ? 'L' : 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{match.gameType}</p>
                        <p className="text-xs opacity-50">vs {match.vsCPU ? 'CPU' : (opponentId === 'CPU' ? 'CPU' : 'Opponent')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono opacity-50">
                        {match.createdAt?.toDate ? match.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 bg-white/5 flex items-center justify-between border-t border-white/5">
              <button 
                onClick={handlePrev} 
                disabled={page === 1}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-20"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono opacity-50">Page {page}</span>
              <button 
                onClick={handleNext}
                disabled={matches.length < PAGE_SIZE}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-20"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
