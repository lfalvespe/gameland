import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, RefreshCw, Send, Users, User, Trophy, Layout, ChevronLeft, Lock, Info, Play, CheckCircle2, AlertCircle, X, LogOut, Volume2, VolumeX } from 'lucide-react';
import { db, setDoc, updateDoc, doc, onSnapshot, serverTimestamp, arrayUnion, increment, getDoc, deleteDoc, arrayRemove, addDoc, collection } from '../firebase';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useSoundEffects } from '../lib/useSoundEffects';

// --- Constants ---

const THEME_WORDS: Record<string, { word: string; hint: string }[]> = {
  'Filmes/Séries': [
    { word: 'INCEPTION', hint: 'Diretor Christopher Nolan, sonhos dentro de sonhos.' },
    { word: 'GLADIADOR', hint: 'Russell Crowe em Roma Antiga.' },
    { word: 'FRIENDS', hint: 'Série sobre seis amigos em Nova York.' },
    { word: 'CORINGA', hint: 'Vilão icônico do Batman.' },
    { word: 'AVATAR', hint: 'Seres azuis em Pandora.' }
  ],
  'Celebridades': [
    { word: 'BEYONCE', hint: 'Cantora de "Single Ladies" e "Halo".' },
    { word: 'NEYMAR', hint: 'Jogador de futebol brasileiro, o "Menino Ney".' },
    { word: 'MESSI', hint: 'Astro do futebol argentino.' },
    { word: 'ANITTA', hint: 'Cantora brasileira de renome internacional.' },
    { word: 'TOM CRUISE', hint: 'Ator de Missão Impossível.' }
  ],
  'Música': [
    { word: 'THE BEATLES', hint: 'Banda britânica de rock formada por John, Paul, George e Ringo.' },
    { word: 'MICHAEL JACKSON', hint: 'O Rei do Pop, famoso pelo "moonwalk".' },
    { word: 'QUEEN', hint: 'Banda liderada por Freddie Mercury.' },
    { word: 'BOHEMIAN RHAPSODY', hint: 'Música épica do Queen que mistura rock e ópera.' },
    { word: 'BOB MARLEY', hint: 'O maior ícone do Reggae mundial.' },
    { word: 'ELVIS PRESLEY', hint: 'O Rei do Rock and Roll.' },
    { word: 'MADONNA', hint: 'A Rainha do Pop.' },
    { word: 'ROLLING STONES', hint: 'Banda de rock de Mick Jagger e Keith Richards.' },
    { word: 'NIRVANA', hint: 'Banda de grunge liderada por Kurt Cobain.' },
    { word: 'IMAGINE', hint: 'Hino de paz composto por John Lennon.' }
  ],
  'Cidades do mundo': [
    { word: 'PARIS', hint: 'Cidade Luz, capital da França.' },
    { word: 'TÓQUIO', hint: 'Capital do Japão.' },
    { word: 'LONDRES', hint: 'Capital da Inglaterra, terra do Big Ben.' },
    { word: 'RECIFE', hint: 'Veneza brasileira.' },
    { word: 'VENEZA', hint: 'Cidade italiana famosa pelos seus canais.' }
  ],
  'Esportes': [
    { word: 'BASQUETE', hint: 'Esporte jogado com uma cesta.' },
    { word: 'NATAÇÃO', hint: 'Esporte praticado em piscinas.' },
    { word: 'TÊNIS', hint: 'Esporte praticado com raquetes e uma bola amarela.' },
    { word: 'VÔLEI', hint: 'Esporte jogado com uma rede alta.' },
    { word: 'ATLETISMO', hint: 'Conjunto de esportes como corrida e saltos.' }
  ],
  'Futebol': [
    { word: 'ESCANTEIO', hint: 'Cobrança do canto do campo.' },
    { word: 'IMPECHMENT', hint: 'Wait, no - impedimento.' }, // Correcting common typo/confusion
    { word: 'IMPEDIMENTO', hint: 'Regra que confunde muita gente no futebol.' },
    { word: 'PÊNALTI', hint: 'Cobrança direta de falta dentro da área.' },
    { word: 'GOLEADOR', hint: 'Jogador que faz muitos gols.' },
    { word: 'ESTÁDIO', hint: 'Local onde ocorrem as partidas.' }
  ],
  'Geografia/História': [
    { word: 'AMAZÔNIA', hint: 'Maior floresta tropical do mundo.' },
    { word: 'PIRÂMIDES', hint: 'Grandes monumentos do Egito Antigo.' },
    { word: 'CONTINENTE', hint: 'Grande massa de terra cercada por oceanos.' },
    { word: 'DESCOBRIMENTO', hint: 'Evento histórico de 1500 no Brasil.' },
    { word: 'RENASCIMENTO', hint: 'Período cultural e artístico europeu.' }
  ],
  'Ciência/Natureza': [
    { word: 'FOTOSSÍNTESE', hint: 'Processo pelo qual plantas produzem energia.' },
    { word: 'GRAVIDADE', hint: 'Força que nos mantém no chão.' },
    { word: 'EVOLUÇÃO', hint: 'Teoria de Charles Darwin.' },
    { word: 'ATMOSFERA', hint: 'Camada de gases que envolve a Terra.' },
    { word: 'PLANETA', hint: 'Corpo celeste que orbita uma estrela.' }
  ],
  'Mundo Animal': [
    { word: 'ELEFANTE', hint: 'O maior animal terrestre.' },
    { word: 'ORANGOTANGO', hint: 'Primata de pelos ruivos.' },
    { word: 'ORNITORRINCO', hint: 'Mamífero que bota ovos.' },
    { word: 'GUEPARDO', hint: 'O animal terrestre mais rápido.' },
    { word: 'BALEIA', hint: 'O maior animal do planeta.' }
  ]
};

const LOCAL_WORDS = [
  ...Object.values(THEME_WORDS).flat()
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

// --- Components ---

const HangmanFigure = ({ mistakes, profilePic }: { mistakes: number; profilePic?: string }) => {
  const woodDark = "#451a03"; // Brown-950
  const woodMedium = "#78350f"; // Brown-900
  const woodLight = "#92400e"; // Brown-800
  const ropeColor = "#fbbf24"; // Amber-400
  const figureColor = "#f8fafc"; // Slate-50 for high contrast

  return (
    <div className="w-full max-w-[280px] aspect-[1/1.2] relative overflow-visible">
      {/* Structural Shadow */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-black/20 blur-xl rounded-full translate-y-4" />
      
      <svg viewBox="0 0 200 250" className="w-full h-full overflow-visible drop-shadow-2xl">
        <defs>
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={woodMedium} />
            <stop offset="50%" stopColor={woodLight} />
            <stop offset="100%" stopColor={woodDark} />
          </linearGradient>

          {/* Prisoner Stripe Pattern */}
          <pattern id="stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(0)">
            <rect width="10" height="5" fill="#111827" />
            <rect y="5" width="10" height="5" fill="#f8fafc" />
          </pattern>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <clipPath id="headClip">
            <circle cx="140" cy="80" r="22" />
          </clipPath>
        </defs>

        {/* --- WOODEN STRUCTURE --- */}
        {/* Base Plate */}
        <motion.rect 
          x="20" y="230" width="160" height="12" rx="2" fill={woodDark}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        />
        
        {/* Vertical Post */}
        <motion.rect 
          x="45" y="20" width="16" height="210" rx="1" fill="url(#woodGrad)"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1 }}
        />
        
        {/* Horizontal Beam */}
        <motion.rect 
          x="45" y="20" width="115" height="16" rx="1" fill="url(#woodGrad)"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
          transition={{ delay: 0.2 }}
        />
        
        {/* Diagonal Brace */}
        <motion.path 
          d="M 45 70 L 95 20" 
          stroke={woodDark} strokeWidth="12" strokeLinecap="square"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.4 }}
        />
        <motion.path 
          d="M 45 70 L 95 20" 
          stroke={woodMedium} strokeWidth="8" strokeLinecap="square"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.4 }}
        />

        {/* Coiled Rope Effect */}
        <g>
          {/* Vertical Rope Part */}
          <motion.line 
            x1="140" y1="36" x2="140" y2="44" 
            stroke={ropeColor} strokeWidth="6" strokeLinecap="round"
            initial={{ y2: 36 }} animate={{ y2: 44 }}
            transition={{ delay: 0.6 }}
          />
          
          {/* Rope Coils (Knot) - Aligned to sit on the loop */}
          <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}>
            <ellipse cx="140" cy="44" rx="10" ry="4" fill={ropeColor} transform="rotate(-5 140 44)" />
            <ellipse cx="140" cy="51" rx="11" ry="4" fill={ropeColor} transform="rotate(-5 140 51)" />
            <ellipse cx="140" cy="58" rx="10" ry="4" fill={ropeColor} transform="rotate(-5 140 58)" />
          </motion.g>

          {/* Noose Loop - Perfect circle matching the profile pic size (r=22) */}
          <motion.circle 
            cx="140" cy="80" r="22"
            fill="none" 
            stroke={ropeColor} strokeWidth="6" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          />
        </g>

        {/* --- PRISONER FIGURE --- */}
        <g filter="url(#glow)">
          {/* Head & Hat */}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={mistakes >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, type: 'spring' }}
            style={{ originX: '140px', originY: '80px' }}
          >
            {/* Prisoner Hat */}
            <rect x="130" y="52" width="20" height="8" rx="1" fill="url(#stripes)" stroke="#000" strokeWidth="0.5" />
            
            {profilePic ? (
              <>
                <circle cx="140" cy="80" r="22" fill="#fff" />
                <image 
                  xlinkHref={profilePic} 
                  x="118" y="58" width="44" height="44" 
                  clipPath="url(#headClip)" preserveAspectRatio="xMidYMid slice"
                />
                <circle cx="140" cy="80" r="22" fill="none" stroke="#000" strokeWidth="1" />
              </>
            ) : (
              <circle cx="140" cy="80" r="22" fill="#fed7aa" stroke="#9a3412" strokeWidth="2" />
            )}
          </motion.g>

          {/* Torso (Shirt) */}
          <motion.rect 
            x="126" y="102" width="28" height="58" rx="4"
            fill="url(#stripes)"
            stroke="#000" strokeWidth="1"
            initial={{ scaleY: 0, opacity: 0 }} 
            animate={mistakes >= 2 ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }} 
            style={{ originY: 0 }}
          />

          {/* Left Arm (Sleeve) */}
          <motion.path 
            d="M 126 115 C 115 115, 105 125, 105 145" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 3 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 126 115 C 115 115, 105 125, 105 145" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 3 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Right Arm (Sleeve) */}
          <motion.path 
            d="M 154 115 C 165 115, 175 125, 175 145" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 4 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 154 115 C 165 115, 175 125, 175 145" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 4 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Left Leg (Trouser) */}
          <motion.path 
            d="M 132 160 C 132 175, 115 185, 115 210" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 5 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 132 160 C 132 175, 115 185, 115 210" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 5 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Right Leg (Trouser) */}
          <motion.path 
            d="M 148 160 C 148 175, 165 185, 165 210" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 6 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 148 160 C 148 175, 165 185, 165 210" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 6 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
        </g>

        {/* Face Expressions */}
        <AnimatePresence>
          {mistakes >= 1 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               {mistakes < 6 ? (
                 !profilePic && (
                   <>
                     <circle cx="132" cy="74" r="2.5" fill={figureColor} />
                     <circle cx="148" cy="74" r="2.5" fill={figureColor} />
                     <motion.path 
                       d="M 134 88 Q 140 94 146 88" 
                       fill="none" stroke={figureColor} strokeWidth="2.5" strokeLinecap="round"
                       animate={mistakes >= 4 ? { d: "M 134 94 Q 140 88 146 94" } : {}}
                     />
                   </>
                 )
               ) : (
                 <>
                   <g className={profilePic ? "drop-shadow-md" : ""}>
                     <path d="M 128 70 L 136 78 M 136 70 L 128 78" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                     <path d="M 144 70 L 152 78 M 152 70 L 144 78" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                   </g>
                   {profilePic && (
                     <circle cx="140" cy="80" r="22" fill="rgba(239, 68, 68, 0.4)" clipPath="url(#headClip)" />
                   )}
                   <path d="M 130 92 Q 140 82 150 92" fill="none" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                 </>
               )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
};

// --- Main Component ---

interface HangmanProps {
  mode: 'local' | 'online';
  matchId?: string;
  opponentId?: string;
  onClose: () => void;
}

export function Hangman({ mode, matchId, opponentId, onClose }: HangmanProps) {
  const { user, profile } = useAuth();
  
  // Local State
  const [localGame, setLocalGame] = useState<{
    word: string;
    hint: string;
    guesses: string[];
    mistakes: number;
    score: number;
    status: 'playing' | 'won' | 'lost';
  } | null>(null);

  // Online Match State
  const [matchData, setMatchData] = useState<any>(null);
  const [mySetup, setMySetup] = useState({ word: '', hint: '' });
  const [loading, setLoading] = useState(mode === 'online');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(mode === 'local');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, any>>({});
  const [matchArchived, setMatchArchived] = useState(false);

  // Sound Management
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('game_muted') === 'true');
  const { playSound } = useSoundEffects(isMuted);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('game_muted', String(newMuted));
  };

  const triggerLocalRematch = () => {
    setLocalGame(null);
    setShowThemeSelector(true);
    setSelectedTheme(null);
    setMatchArchived(false);
  };

  const saveMatchResult = async (result: 'won' | 'lost' | 'draw', vsCPU: boolean = false, finalMistakes: number = 0) => {
    if (!user) return;
    try {
      const players = mode === 'online' ? (matchData?.players || [user.uid, opponentId]) : [user.uid];
      
      await addDoc(collection(db, 'matches'), {
        players: players,
        gameType: 'Hangman',
        vsCPU: vsCPU,
        winner: result === 'won' ? user.uid : (result === 'draw' ? 'Draw' : (mode === 'online' ? (opponentId || 'Opponent') : 'CPU')),
        createdAt: serverTimestamp()
      });

      const userRef = doc(db, 'users', user.uid);
      const gameScore = mode === 'local' ? (localGame?.score || 0) : (matchData?.playerData?.[user.uid]?.sessionScore || 0);
      
      const themeUpdate: Record<string, any> = {};
      if (selectedTheme) {
        themeUpdate[`stats.hangman.themesPlayed.${selectedTheme.replace(/\./g, '_')}`] = increment(1);
      }

      await updateDoc(userRef, {
        score: increment(result === 'won' ? 50 + gameScore : (result === 'draw' ? 20 : 10)),
        'stats.hangman.wins': increment(result === 'won' ? 1 : 0),
        'stats.hangman.losses': increment(result === 'lost' ? 1 : 0),
        'stats.hangman.draws': increment(result === 'draw' ? 1 : 0),
        'stats.hangman.total': increment(1),
        'stats.hangman.totalMistakes': increment(finalMistakes),
        ...themeUpdate
      });
    } catch (e) {
      console.error("Error saving match result:", e);
    }
  };

  useEffect(() => {
    if (mode === 'online' && matchData?.status === 'finished' && !matchArchived && user) {
      const isWinner = matchData.winner === user.uid;
      const isDraw = matchData.winner === 'draw';
      const result = isWinner ? 'won' : (isDraw ? 'draw' : 'lost');
      const myMistakes = matchData.playerData?.[user.uid]?.wrongGuesses || 0;
      saveMatchResult(result, false, myMistakes);
      setMatchArchived(true);
    }
  }, [mode, matchData?.status, matchArchived, user]);

  // Initialize Local Game
  const startNewLocalGame = useCallback((theme?: string) => {
    let pool = LOCAL_WORDS;
    if (theme && THEME_WORDS[theme]) {
      pool = THEME_WORDS[theme];
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    setLocalGame({
      word: random.word.toUpperCase(),
      hint: random.hint,
      guesses: [],
      mistakes: 0,
      score: 0,
      status: 'playing'
    });
    setSelectedTheme(theme || 'Aleatório');
    setShowThemeSelector(false);
  }, []);

  useEffect(() => {
    if (mode === 'local' && !localGame && !showThemeSelector) {
      setShowThemeSelector(true);
    }
  }, [mode, localGame, showThemeSelector]);

  // Online Subscription
  useEffect(() => {
    if (mode === 'online' && matchId) {
      const unsub = onSnapshot(doc(db, 'hangman_matches', matchId), 
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setMatchData(data);

            // Fetch player profiles if they are missing
            if (data.players) {
              const profilesToFetch = data.players.filter((id: string) => !playerProfiles[id]);
              if (profilesToFetch.length > 0) {
                const fetchedProfiles = { ...playerProfiles };
                for (const pid of profilesToFetch) {
                  try {
                    const pSnap = await getDoc(doc(db, 'users', pid));
                    if (pSnap.exists()) {
                      fetchedProfiles[pid] = pSnap.data();
                    }
                  } catch (e) {
                    console.error("Error fetching player profile:", pid, e);
                  }
                }
                setPlayerProfiles(fetchedProfiles);
              }
            }
          } else {
            setMatchData(null);
            console.warn("Hangman: Match document does not exist anymore.");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Hangman Match Error:", error);
          setLoading(false);
        }
      );
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [mode, matchId]); // Removed playerProfiles from dependency to avoid loop and unnecessary re-loading state

  useEffect(() => {
    if (mode === 'online' && matchId) {
      const handleUnload = () => {
        const isGameOver = (mode === 'online' && matchData?.status === 'finished');
        if (!isGameOver) {
          handleLeave();
        }
      };

      window.addEventListener('beforeunload', handleUnload);
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
      };
    }
  }, [mode, matchId, matchData]);

  // Handle building missing match document if host
  const initMissingMatch = async () => {
    if (!user || !matchId || matchData) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'hangman_matches', matchId), {
        players: [user.uid], // We'll add others as they join
        status: 'setup',
        playerData: {},
        scores: {},
        currentRound: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExitClick = () => {
    const isGameOver = (mode === 'local' && localGame?.status !== 'playing') || (mode === 'online' && (matchData?.status === 'finished'));
    if (!isGameOver) {
      setShowExitConfirm(true);
    } else {
      handleLeave();
    }
  };

  const handleLeave = async () => {
    if (mode === 'online' && matchId && user) {
      try {
        const matchRef = doc(db, 'hangman_matches', matchId);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          const mData = matchSnap.data();
          const isGameOver = mData.status === 'finished';

          // If game is still in progress, set the leaving player as loser and end the game
          if (!isGameOver) {
            const opponentId = mData.players.find((p: string) => p !== user.uid);
            if (opponentId) {
              await updateDoc(matchRef, {
                status: 'finished',
                winner: opponentId, // The one who stays wins
                [`playerData.${user.uid}.status`]: 'lost',
                [`playerData.${opponentId}.status`]: 'won',
                updatedAt: serverTimestamp(),
                leftEarly: user.uid // Mark who left
              });
            }
          }
        }

        const roomRef = doc(db, 'rooms', matchId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          const newParticipants = (roomData.participants || []).filter((id: string) => id !== user.uid);
          
          if (newParticipants.length === 0) {
            await deleteDoc(roomRef);
            // We don't delete the match document here if we want the winner to see the result screen
            // But if nobody is left, we should probably clean it up or let it expire
            if (newParticipants.length === 0) {
              await deleteDoc(matchRef);
            }
          } else {
            await updateDoc(roomRef, {
              participants: arrayRemove(user.uid),
              participantCount: increment(-1)
            });
          }
        }
      } catch (error) {
        console.error("Error on leaving cleanup:", error);
      }
    }
    onClose();
  };

  // Sync local setup from DB on refresh
  useEffect(() => {
    if (mode === 'online' && matchData && user) {
      const pData = matchData.playerData?.[user.uid];
      if (matchData.status === 'setup' && pData?.ready && !mySetup.word) {
        setMySetup({
          word: pData.word || '',
          hint: pData.hint || ''
        });
      }
      
      // Clear local setup state when game is playing or finished to avoid stale data in rematches
      if ((matchData.status === 'playing' || matchData.status === 'finished') && (mySetup.word || mySetup.hint)) {
        setMySetup({ word: '', hint: '' });
      }
    }
  }, [mode, matchData, user, mySetup.word, mySetup.hint]);

  // Game Logic Helpers
  const handleGuess = async (letter: string) => {
    if (mode === 'local' && localGame && localGame.status === 'playing') {
      if (localGame.guesses.includes(letter)) return;

      const isCorrect = normalizeText(localGame.word).includes(letter);
      const newGuesses = [...localGame.guesses, letter];
      const newMistakes = isCorrect ? localGame.mistakes : localGame.mistakes + 1;
      
      playSound(isCorrect ? 'correct' : 'wrong');
      
      let scoreChange = isCorrect ? 10 : -2;
      let newScore = Math.max(0, (localGame.score || 0) + scoreChange);

      let newStatus: 'playing' | 'won' | 'lost' = 'playing';
      const allGuessed = localGame.word.split('').every(l => newGuesses.includes(normalizeText(l)) || l === ' ');
      
      if (allGuessed) {
        newStatus = 'won';
        newScore += 50;
      }
      else if (newMistakes >= 6) newStatus = 'lost';

      setLocalGame({
        ...localGame,
        guesses: newGuesses,
        mistakes: newMistakes,
        score: newScore,
        status: newStatus
      });

      if (newStatus !== 'playing') {
        saveMatchResult(newStatus === 'won' ? 'won' : 'lost', true, newMistakes);
        playSound(newStatus === 'won' ? 'win' : 'lose');
      }
    } else if (mode === 'online' && matchData && user) {
      const pData = matchData.playerData?.[user.uid];
      if (!pData || pData.status !== 'playing' || matchData.status !== 'playing') return;
      if (pData.guesses?.includes(letter)) return;

      const opponentId = matchData.players.find((p: string) => p !== user.uid);
      const targetWord = matchData.playerData[opponentId].word.toUpperCase();
      const isCorrect = normalizeText(targetWord).includes(letter);
      
      playSound(isCorrect ? 'correct' : 'wrong');
      
      const newGuesses = Array.from(new Set([...(pData.guesses || []), letter]));
      const newMistakes = isCorrect ? (pData.wrongGuesses || 0) : (pData.wrongGuesses || 0) + 1;

      let scoreChange = isCorrect ? 10 : -2;
      let newScore = Math.max(0, (pData.sessionScore || 0) + scoreChange);

      const allGuessed = targetWord.split('').every((l: string) => newGuesses.includes(normalizeText(l)) || l === ' ');
      const playerGameOver = allGuessed || newMistakes >= 6;

      const targetLetters = targetWord.split('').filter((l: string) => l !== ' ');
      const revealedCount = targetLetters.filter((l: string) => newGuesses.includes(normalizeText(l))).length;

      const playerUpdate: any = {
        [`playerData.${user.uid}.guesses`]: newGuesses,
        [`playerData.${user.uid}.wrongGuesses`]: newMistakes,
        [`playerData.${user.uid}.revealedCount`]: revealedCount,
        [`playerData.${user.uid}.sessionScore`]: newScore,
        updatedAt: serverTimestamp()
      };

      if (playerGameOver) {
        if (allGuessed) newScore += 50;
        playerUpdate[`playerData.${user.uid}.sessionScore`] = newScore;
        playerUpdate[`playerData.${user.uid}.status`] = allGuessed ? 'won' : 'lost';
        playerUpdate[`playerData.${user.uid}.finishTime`] = serverTimestamp();
        
        playSound(allGuessed ? 'win' : 'lose');
        
        // Calculate duration if startTime exists
        if (pData.startTime) {
          const startTime = pData.startTime.toDate ? pData.startTime.toDate().getTime() : pData.startTime;
          playerUpdate[`playerData.${user.uid}.duration`] = Date.now() - startTime;
        }

        // Check if match should end
        const otherPData = matchData.playerData[opponentId];
        
        // Match ends if:
        // 1. Current player won (first to win)
        // 2. Both finished
        // GUARD: Only set match to finished if it's still playing
        if (matchData.status === 'playing') {
          if (allGuessed) {
            playerUpdate.status = 'finished';
            // If both finished in the same block (unlikely but possible with batching)
            if (otherPData && otherPData.status === 'won') {
               playerUpdate.winner = 'draw';
            } else {
               playerUpdate.winner = user.uid;
            }
          } else if (otherPData && (otherPData.status === 'won' || otherPData.status === 'lost')) {
            // If current lost and other was already finished
            playerUpdate.status = 'finished';
            if (otherPData.status === 'won') {
              playerUpdate.winner = opponentId;
            } else {
              playerUpdate.winner = 'draw';
            }
          }
        }
      }

      // Final safety guard: if match status changed while we were processing, abort
      const latestSnap = await getDoc(doc(db, 'hangman_matches', matchId!));
      if (latestSnap.exists() && latestSnap.data().status === 'playing') {
        await updateDoc(doc(db, 'hangman_matches', matchId!), playerUpdate);
      }
    }
  };

  const submitOnlineSetup = async () => {
    if (!mySetup.word || !mySetup.hint || !user || !matchId || !matchData) return;

    const updates: any = {
      [`playerData.${user.uid}.word`]: mySetup.word.toUpperCase().trim(),
      [`playerData.${user.uid}.hint`]: mySetup.hint.trim(),
      [`playerData.${user.uid}.ready`]: true,
      [`playerData.${user.uid}.status`]: 'setup',
      updatedAt: serverTimestamp()
    };

    const players = matchData.players || [];
    const otherPlayers = players.filter((pid: string) => pid !== user.uid);
    const othersReady = otherPlayers.length > 0 && otherPlayers.every((pid: string) => matchData.playerData?.[pid]?.ready);

    if (othersReady) {
      updates.status = 'playing';
      updates.startTime = serverTimestamp();
      players.forEach((pid: string) => {
        updates[`playerData.${pid}.status`] = 'playing';
        updates[`playerData.${pid}.startTime`] = serverTimestamp();
        updates[`playerData.${pid}.guesses`] = [];
        updates[`playerData.${pid}.wrongGuesses`] = 0;
        updates[`playerData.${pid}.revealedCount`] = 0;
      });
    }

    await updateDoc(doc(db, 'hangman_matches', matchId), updates);
    setShowSetupModal(false);
  };

  const saveLocalSetup = () => {
    if (!mySetup.word || !mySetup.hint) return;
    setShowSetupModal(false);
  };


  const sendRematchInvite = async () => {
    if (!matchId || !user) return;
    await updateDoc(doc(db, 'hangman_matches', matchId), {
      rematchInvite: {
        from: user.uid,
        status: 'pending'
      },
      updatedAt: serverTimestamp()
    });
  };

  const respondToRematch = async (accept: boolean) => {
    if (!matchId || !matchData || !user) return;
    
    if (accept) {
      // Reset match for a new game
      const resetPlayerData: Record<string, any> = {};
      matchData.players.forEach((pid: string) => {
        resetPlayerData[pid] = {
          word: '',
          hint: '',
          ready: false,
          status: 'setup'
        };
      });

      // Update match document
      await updateDoc(doc(db, 'hangman_matches', matchId), {
        status: 'setup',
        playerData: resetPlayerData,
        winner: null,
        startTime: null,
        rematchInvite: null,
        updatedAt: serverTimestamp()
      });

      // Also update parent room status to keep things in sync
      try {
        await updateDoc(doc(db, 'rooms', matchId), {
          status: 'waiting', // or 'playing'? In GameLand, setup phase is usually 'waiting' or 'playing' but 'waiting' is more descriptive for lobby
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error updating room status during rematch:", e);
      }
      
      // Reset local setup state
      setMySetup({ word: '', hint: '' });
    } else {
      await updateDoc(doc(db, 'hangman_matches', matchId), {
        'rematchInvite.status': 'rejected',
        updatedAt: serverTimestamp()
      });
    }
  };

  // UI Renderers
  const renderModals = () => (
    <AnimatePresence>
      {showThemeSelector && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl">
                <Layout className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Escolha um Tema</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">Modo Local</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(THEME_WORDS).map((theme) => (
                <button
                  key={theme}
                  onClick={() => startNewLocalGame(theme)}
                  className="group relative flex flex-col p-4 bg-white/5 border border-white/10 rounded-2xl text-left transition-all hover:bg-white/10 hover:border-purple-500/50 active:scale-95"
                >
                  <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-purple-400 transition-colors">{theme}</span>
                  <span className="text-[10px] font-bold opacity-30 text-white italic">Rodada Temática</span>
                </button>
              ))}
              <button
                onClick={() => startNewLocalGame()}
                className="group relative flex flex-col p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left transition-all hover:bg-blue-500/20 hover:border-blue-500/50 active:scale-95"
              >
                <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">Aleatório</span>
                <span className="text-[10px] font-bold opacity-30 text-white italic">Todas as palavras</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-8 py-3 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Cancelar e Sair
            </button>
          </motion.div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={() => setShowSetupModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 opacity-40 text-white" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Play className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Preparar Palavra</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">Configuração da Rodada</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Palavra Secreta</label>
                <input 
                  type="text" 
                  value={mySetup.word}
                  onChange={(e) => setMySetup(prev => ({ ...prev, word: e.target.value.toUpperCase().replace(/[^A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ ]/g, '') }))}
                  maxLength={15}
                  placeholder="EX: PROGRAMAÇÃO"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-widest placeholder:text-white/10 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Dica Útil</label>
                <input 
                  type="text" 
                  value={mySetup.hint}
                  onChange={(e) => setMySetup(prev => ({ ...prev, hint: e.target.value }))}
                  maxLength={40}
                  placeholder="EX: Linguagem da Web"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-wide placeholder:text-white/10 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <button
              onClick={saveLocalSetup}
              disabled={!mySetup.word || !mySetup.hint}
              className="w-full mt-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
            >
              Salvar Configurações
            </button>
          </motion.div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 opacity-40 text-white" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-yellow-500/10 rounded-2xl">
                <Info className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">How to Play</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">Hangman Rules</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                <div>
                  <h4 className="font-bold mb-1 text-white">Objective</h4>
                  <p className="text-sm opacity-60 text-white">Guess the secret word before the hangman figure is fully drawn. You can make up to 6 mistakes.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-purple-400">2</div>
                <div>
                  <h4 className="font-bold mb-1 text-white">The Duel</h4>
                  <p className="text-sm opacity-60 text-white">In online mode, each player sets a word for the other. Points are awarded based on how many mistakes you avoid.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all active:scale-95"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <LogOut className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-white">Exit Game?</h2>
            <p className="text-sm opacity-60 mb-12 leading-relaxed text-white">
              If you leave now, you will lose your progress in this match. Are you sure you want to quit?
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleLeave}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 text-white"
              >
                Yes, Exit Game
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 text-white"
              >
                No, Stay and Play
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderWord = (word: string, guesses: string[]) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {word.split('').map((letter, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "w-8 h-10 sm:w-10 sm:h-14 flex items-center justify-center border-b-4 text-2xl sm:text-4xl font-black transition-all",
              letter === ' ' ? "border-transparent" : "border-blue-500/30",
              guesses.includes(normalizeText(letter)) ? "text-white" : "text-transparent"
            )}
          >
            <AnimatePresence mode="popLayout">
              {guesses.includes(normalizeText(letter)) || letter === ' ' ? (
                <motion.span
                  key="letter"
                  initial={{ scale: 0, y: 10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 15
                  }}
                >
                  {letter}
                </motion.span>
              ) : (
                <span key="empty">{letter}</span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderKeyboard = (guesses: string[], correctWord?: string) => {
    return (
      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 sm:gap-2 max-w-2xl mx-auto">
        {ALPHABET.map(letter => {
          const isGuessed = guesses.includes(letter);
          const isCorrect = correctWord && normalizeText(correctWord).includes(letter);
          
          return (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={isGuessed}
              className={cn(
                "h-10 sm:h-12 rounded-lg font-bold text-sm transition-all active:scale-95",
                !isGuessed && "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
                isGuessed && isCorrect && "bg-green-500/20 border border-green-500/40 text-green-400 cursor-not-allowed",
                isGuessed && !isCorrect && "bg-rose-500/20 border border-rose-500/40 text-rose-400 opacity-40 cursor-not-allowed"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    );
  };

  // --- MAIN RENDER ---
  const isSetup = mode === 'online' && matchData?.status === 'setup';
  const isPlaying = (mode === 'local' && localGame?.status === 'playing') || (mode === 'online' && matchData?.status === 'playing');

  let mainContent: React.ReactNode = null;

  if (loading) {
    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading Forca...</p>
      </div>
    );
  } else if (mode === 'online' && !matchData) {
    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Partida não encontrada</h2>
        <p className="text-sm opacity-40 max-w-xs mb-8">
          Não conseguimos carregar os dados desta partida online. Se você for o anfitrião, tente inicializar novamente.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={initMissingMatch}
            className="px-8 py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Inicializar Match
          </button>
          <button 
            onClick={handleLeave}
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  } else if (isSetup || isPlaying || (localGame && localGame.status !== 'playing')) {
    const isGameOver = (mode === 'local' && localGame?.status !== 'playing') || (mode === 'online' && matchData?.status === 'finished');
    const playerStatus = mode === 'online' ? matchData?.playerData?.[user!.uid]?.status : localGame?.status;
    const won = playerStatus === 'won';

    const isReady = mode === 'online' && matchData?.playerData?.[user!.uid]?.ready;
    const hasDefinedWord = mySetup.word.length > 0;

    const opponentId = mode === 'online' ? matchData.players.find((p: string) => p !== user?.uid) : null;
    
    // In online mode:
    // - If playing: show opponent's word (the one we are guessing)
    // - If setup: show my own word (the one I am defining)
    const currentWord = mode === 'local' ? localGame?.word : 
                      (matchData?.status === 'playing') ? 
                      (opponentId ? matchData.playerData[opponentId].word : '') : 
                      (hasDefinedWord ? mySetup.word : ' '.repeat(Math.max(5, mySetup.word.length || 8)));
    
    const currentHint = mode === 'local' ? localGame?.hint : 
                       (matchData?.status === 'playing') ? 
                       (opponentId ? matchData.playerData[opponentId].hint : '') : 
                       (hasDefinedWord ? mySetup.hint : 'Aguardando palavra...');

    const mistakesCount = mode === 'local' ? (localGame?.mistakes || 0) : (matchData?.playerData?.[user!.uid]?.wrongGuesses || 0);
    const currentGuesses = mode === 'local' ? (localGame?.guesses || []) : 
                           (matchData?.status === 'setup' ? (hasDefinedWord ? ALPHABET : []) : (matchData?.playerData?.[user!.uid]?.guesses || []));
    const isPlayerPlaying = mode === 'online' ? (matchData?.playerData?.[user!.uid]?.status === 'playing') : (localGame?.status === 'playing');

    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col text-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button 
              onClick={handleExitClick}
              className="flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase text-white"
            >
              <X className="w-5 h-5" />
              <span className="hidden min-[450px]:inline">EXIT GAME</span>
              <span className="min-[450px]:hidden">EXIT</span>
            </button>

            <div className="text-center absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Forca</h1>
              <div className="flex flex-col sm:flex-row items-center sm:gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">{mode === 'local' ? 'Modo Local' : 'Duelo Simultâneo'}</p>
                {mode === 'local' && selectedTheme && (
                  <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                    {selectedTheme}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={toggleMute}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/80" />}
              </button>
              <div className="hidden min-[500px]:flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <Trophy className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Score: {mode === 'local' ? localGame?.score : (matchData?.playerData?.[user!.uid]?.sessionScore || 0)}</span>
              </div>
              <button 
                onClick={() => setShowRules(true)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
              >
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-[10px] font-black tracking-widest uppercase hidden sm:inline text-white">Rules</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-32 sm:pt-40 pb-12 p-6 flex flex-col items-center">
          {mode === 'online' && matchData && (
            <div className="w-full max-w-4xl flex items-center justify-center gap-4 sm:gap-12 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              {matchData.players.map((playerId: string) => {
                const isMe = playerId === user?.uid;
                const pInfo = playerProfiles[playerId] || {};
                const pData = matchData.playerData?.[playerId];
                const isActive = pData?.status === 'playing';
                const isReady = pData?.ready;

                return (
                  <div 
                    key={playerId}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all relative min-w-[120px] sm:min-w-[160px]",
                      isActive ? "bg-blue-500/10 border-blue-500/50 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/5 opacity-60",
                      isMe && "ring-2 ring-white/10 ring-offset-4 ring-offset-slate-950"
                    )}
                  >
                    <div className="relative">
                      {pInfo.photoURL ? (
                        <img 
                          src={pInfo.photoURL} 
                          alt={pInfo.displayName} 
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2",
                            isActive ? "border-blue-500" : "border-white/10"
                          )}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/10">
                          <User className="w-6 h-6 sm:w-8 sm:h-8 opacity-40" />
                        </div>
                      )}
                      {isReady && matchData.status === 'setup' && (
                        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest truncate max-w-[100px] sm:max-w-[140px]">
                        {isMe ? 'Você' : (pInfo.displayName || 'Jogador')}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-[8px] font-black uppercase opacity-40">Erros</span>
                        <span className="text-xs font-black italic text-rose-400">{pData?.wrongGuesses || 0}/6</span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                        Jogando
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Side: Figure and Hint */}
            <div className="flex flex-col items-center gap-8">
              <HangmanFigure mistakes={mistakesCount} profilePic={profile?.photoURL || user?.photoURL} />
              
              <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 sm:p-10 w-full max-w-sm text-center relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50" />
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Info className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Dica Secreta</span>
                </div>
                
                {mode === 'online' && matchData?.status === 'setup' ? (
                  <div className="space-y-4">
                    {!isReady ? (
                      <>
                        {!hasDefinedWord ? (
                          <button 
                            onClick={() => setShowSetupModal(true)}
                            className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 text-white"
                          >
                            <Play className="w-3 h-3 fill-current" /> Informar sua palavra
                          </button>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="text-xs font-bold text-green-400 mb-1">Palavra definida com sucesso!</div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowSetupModal(true)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all text-white"
                              >
                                Editar
                              </button>
                              <button 
                                onClick={submitOnlineSetup}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-green-900/20 text-white"
                              >
                                Ready
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-4 text-white">
                        <div className="flex flex-col items-center gap-3 animate-pulse">
                          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Aguardando oponente...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <p className="text-xl sm:text-2xl font-black italic text-white leading-tight drop-shadow-sm">{currentHint}</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="h-0.5 w-4 bg-white/10" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Boa Sorte</span>
                      <div className="h-0.5 w-4 bg-white/10" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Word and Keyboard */}
            <div className="flex flex-col gap-12 w-full">
              {renderWord(currentWord || '', currentGuesses)}

              <AnimatePresence mode="wait">
                {isPlayerPlaying ? (
                  <motion.div 
                    key="keyboard"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-white"
                  >
                    {renderKeyboard(currentGuesses, currentWord)}
                  </motion.div>
                ) : (mode === 'local' && !isPlayerPlaying) || (mode === 'online' && !isPlayerPlaying && matchData?.status === 'playing') ? (
                  <motion.div 
                    key="status-overlay"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-white"
                  >
                    <div className={cn(
                      "inline-flex p-12 rounded-[40px] mb-8 flex-col items-center text-center gap-4 shadow-2xl",
                      won ? "bg-green-500/10 border border-green-500/20" : "bg-rose-500/10 border border-rose-500/20"
                    )}>
                      <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center mb-2",
                        won ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                      )}>
                        {won ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                      </div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                        {won ? 'Adivinhou!' : 'Enforcado!'}
                      </h3>
                      <p className="text-sm font-bold opacity-60">
                        {won ? `Você descobriu a palavra "${currentWord}"!` : `A palavra era: ${currentWord}`}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                      {mode === 'local' ? (
                        <button 
                          onClick={triggerLocalRematch}
                          className="flex-1 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-500 transition-all font-black italic text-white"
                        >
                          <RefreshCw className="w-4 h-4" /> Jogar Novamente
                        </button>
                      ) : (
                        <div className="flex-1 py-5 bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-60">
                          <RefreshCw className="w-4 h-4 animate-spin mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Aguardando</span>
                          <span className="text-[8px] font-bold opacity-40">Finalização Geral da Partida</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (mode === 'online' && matchData?.status === 'finished') {
    const players = matchData.players;
    const winner = matchData.winner;
    const isWinner = winner === user?.uid;
    const isDraw = winner === 'draw';

    const formatDuration = (ms?: number) => {
      if (!ms) return '-';
      const sec = Math.floor(ms / 1000);
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      return `${min}:${s.toString().padStart(2, '0')}`;
    };

    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-y-auto text-white p-4 sm:p-12">
        <header className="max-w-5xl w-full mx-auto flex items-center justify-between mb-8 sm:mb-12 pt-4">
           <button 
            onClick={handleLeave}
            className="flex items-center gap-2 text-xs font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="text-center">
             <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Fim de Jogo</h2>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-blue-400">Relatório de Batalha</p>
          </div>
          <div className="w-10 sm:w-20" />
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl w-full mx-auto pb-20"
        >
          {/* Winner Banner */}
          <div className={cn(
             "w-full rounded-[40px] p-8 sm:p-12 text-center mb-8 sm:mb-12 shadow-2xl relative overflow-hidden flex flex-col items-center",
             isDraw ? "bg-slate-800 border border-white/10" : 
             isWinner ? "bg-green-500/20 border border-green-500/30" : "bg-rose-500/20 border border-rose-500/30"
          )}>
            <div className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center mb-6",
              isDraw ? "bg-white/10" : isWinner ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
            )}>
              {isDraw ? <Users className="w-10 h-10 sm:w-12 sm:h-12" /> : <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter mb-2">
              {isDraw ? 'Empate Técnico!' : isWinner ? 'Vitória Épica!' : 'Derrota Honrosa'}
            </h1>
            <p className="text-base sm:text-lg font-bold opacity-60 max-w-md">
              {matchData.leftEarly && matchData.leftEarly !== user?.uid ? (
                'O adversário abandonou o campo de batalha. Vitória por WO!'
              ) : isDraw ? (
                'Ambos jogaram excepcionalmente.'
              ) : isWinner ? (
                'Você superou seu oponente no tempo e na lógica.'
              ) : (
                'Seu oponente foi mais rápido desta vez.'
              )}
            </p>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-slate-900 border border-white/10 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl mb-8 sm:mb-12">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-5 p-6 border-b border-white/10 bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Jogador</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Status / Palavra</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Chutes Errados</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Letras Reveladas</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Tempo</div>
            </div>

            {players.map((pid: string) => {
              const info = playerProfiles[pid] || {};
              const data = matchData.playerData[pid];
              const isPMe = pid === user?.uid;
              const opponentId = players.find(p => p !== pid);
              const targetWord = matchData.playerData[opponentId!].word;
              const stats = {
                revealed: data.revealedCount || 0,
                wrong: data.wrongGuesses || 0,
                status: data.status,
                time: formatDuration(data.duration)
              };

              return (
                <div key={pid} className={cn(
                  "flex flex-col md:grid md:grid-cols-5 p-6 sm:p-8 items-center border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors gap-4 md:gap-0",
                  isPMe && "bg-blue-500/5"
                )}>
                  <div className="flex items-center gap-4 self-start md:self-center w-full md:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 overflow-hidden border border-white/10 flex-shrink-0">
                      {info.photoURL ? (
                        <img src={info.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 opacity-40" /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black uppercase tracking-tight truncate">
                        {isPMe ? 'Você' : (info.displayName || 'Jogador')}
                      </div>
                      <div className={cn("text-[9px] font-bold uppercase", isPMe ? "text-blue-400" : "text-white/40")}>
                        {pid === winner ? 'Vencedor' : winner === 'draw' ? 'Empate' : 'Vice'}
                      </div>
                    </div>
                    {/* Mobile Only: Status and Time */}
                    <div className="md:hidden text-right">
                       <span className="text-lg font-black italic block">{stats.time}</span>
                       <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                          stats.status === 'won' ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                       )}>
                         {stats.status === 'won' ? 'Venceu' : 'Perdeu'}
                       </span>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Status / Palavra:</div>
                    <div className="text-center">
                      <span className={cn(
                        "hidden md:inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-1",
                        stats.status === 'won' ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {stats.status === 'won' ? 'Adivinhou' : 'Enforcado'}
                      </span>
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">{targetWord}</div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Chutes Errados:</div>
                    <span className="text-xl font-black italic text-rose-400">{stats.wrong}</span>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0 font-mono">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Letras Reveladas:</div>
                    <span className="text-xl font-black italic text-green-400">{stats.revealed}</span>
                  </div>

                  <div className="hidden md:block text-right">
                    <span className="text-2xl font-black italic">{stats.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleLeave}
              className="flex-1 py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-xl"
            >
              Encerrar Partida
            </button>
            
            {matchData.leftEarly ? (
              <div className="flex-1 py-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-1 opacity-60">
                <Users className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Oponente desconectado</span>
                <span className="text-[8px] font-bold opacity-40">Não é possível solicitar revanche</span>
              </div>
            ) : matchData.rematchInvite ? (
              matchData.rematchInvite.status === 'pending' ? (
                matchData.rematchInvite.from === user?.uid ? (
                  <div className="flex-1 py-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col items-center justify-center gap-1 opacity-80">
                    <RefreshCw className="w-4 h-4 animate-spin mb-1 text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Convite Enviado</span>
                    <span className="text-[8px] font-bold opacity-40">Aguardando oponente...</span>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <button 
                      onClick={() => respondToRematch(true)}
                      className="flex-[2] py-6 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black uppercase tracking-widest text-xs transition-all text-white shadow-lg shadow-blue-900/20"
                    >
                      Aceitar Duelo
                    </button>
                    <button 
                      onClick={() => respondToRematch(false)}
                      className="flex-1 py-6 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all text-rose-400"
                    >
                      Recusar
                    </button>
                  </div>
                )
              ) : matchData.rematchInvite.status === 'rejected' ? (
                <div className="flex-1 py-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex flex-col items-center justify-center gap-1">
                  <X className="w-4 h-4 text-rose-500 mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Desafio Recusado</span>
                  <button 
                    onClick={sendRematchInvite}
                    className="mt-1 text-[8px] font-bold uppercase underline opacity-60 hover:opacity-100"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : null
            ) : (
              <button 
                onClick={sendRematchInvite}
                className="flex-1 py-6 bg-blue-600 border border-blue-500/20 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all font-black text-white shadow-xl shadow-blue-900/20"
              >
                Novo Desafio
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {mainContent}
      {renderModals()}
    </>
  );
}
