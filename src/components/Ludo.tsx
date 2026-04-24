import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, RotateCcw, LogOut, Info, MessageSquare, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Play, User as UserIcon, Users, Cpu, Eye, X, HelpCircle, Lock, Volume2, VolumeX, ArrowLeft, Shield, Home, Sparkles, ChevronRight, ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { db, doc, getDoc, updateDoc, onSnapshot, serverTimestamp, increment, arrayRemove, deleteDoc, collection, query, where, addDoc } from '../firebase';
import { cn } from '../lib/utils';
import { Socket } from 'socket.io-client';
import { Chat } from './Chat';
import { LudoPiece, LudoColor, createLudoInitialPieces } from '../lib/gameUtils';

const BOARD_SIZE = 15;
const TURN_TIME = 20;

const BOARD_PATH = [
  // North branch, right side (Down)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // East branch, top side (Right)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // East center (Right edge)
  [7, 14],
  // East branch, bottom side (Left)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // South branch, right side (Down)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // South center (Bottom edge)
  [14, 7],
  // South branch, left side (Up)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // West branch, bottom side (Left)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // West center (Left edge)
  [7, 0],
  // West branch, top side (Right)
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // North branch, left side (Up)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // North center (Top edge)
  [0, 7]
];

const COLOR_OFFSETS: Record<LudoColor, number> = {
  'green': 1,
  'yellow': 14,
  'blue': 27,
  'red': 40
};

const SAFE_SQUARES = [1, 9, 14, 22, 27, 35, 40, 48]; // Start squares (1, 14, 27, 40) + Secondary stars (+8 each)

const Dice3D = ({ value, rolling, color }: { value: number | null, rolling: boolean, color: LudoColor }) => {
  // Target rotations for each face to be showing on front
  const faceRotations: Record<number, { x: number, y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: 180 }
  };

  const target = faceRotations[(value || 1) as keyof typeof faceRotations];

  const getFaceClass = (color: LudoColor) => {
    const base = "absolute inset-0 rounded-lg border-2 flex items-center justify-center border-white/40 text-white overflow-hidden shadow-lg backdrop-blur-[6px]";
    const gradients = {
      red: "bg-gradient-to-br from-rose-400/40 to-rose-700/40",
      blue: "bg-gradient-to-br from-blue-400/40 to-blue-700/40",
      yellow: "bg-gradient-to-br from-yellow-300/40 to-yellow-600/40",
      green: "bg-gradient-to-br from-green-400/40 to-green-700/40"
    };
    return cn(base, gradients[color]);
  };

  const Shine = () => (
    <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
  );

  const renderFaceContent = (faceValue: number) => {
    if (value === null && !rolling) {
      return <span className="text-4xl font-black relative z-10">?</span>;
    }
    
    switch (faceValue) {
      case 1: return <Dice1 className="w-10 h-10 relative z-10" />;
      case 2: return <Dice2 className="w-10 h-10 relative z-10" />;
      case 3: return <Dice3 className="w-10 h-10 relative z-10" />;
      case 4: return <Dice4 className="w-10 h-10 relative z-10" />;
      case 5: return <Dice5 className="w-10 h-10 relative z-10" />;
      case 6: return <Dice6 className="w-10 h-10 relative z-10" />;
      default: return null;
    }
  };

  return (
    <div className="w-16 h-16 perspective-1000">
      <motion.div
        animate={rolling ? {
          rotateX: [0, 720, 1440],
          rotateY: [0, 540, 1080],
          x: [0, -12, 12, -8, 0],
          y: [0, 10, -10, 8, 0],
          z: [0, 30, 0],
          scale: [1, 1.15, 1]
        } : {
          rotateX: target.x,
          rotateY: target.y,
          x: 0,
          y: 0,
          z: 0,
          scale: 1
        }}
        transition={rolling ? {
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut"
        } : {
          type: "spring",
          stiffness: 100, // Even softer for "perfect" settle
          damping: 12,
          mass: 1.5,      // Slightly heavier feel
          restDelta: 0.001
        }}
        className="w-full h-full relative transform-3d"
      >
        {/* Face 1 */}
        <div style={{ transform: 'rotateY(0deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(1)}
           <Shine />
        </div>
        {/* Face 6 */}
        <div style={{ transform: 'rotateY(180deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(6)}
           <Shine />
        </div>
        {/* Face 2 */}
        <div style={{ transform: 'rotateY(90deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(2)}
           <Shine />
        </div>
        {/* Face 5 */}
        <div style={{ transform: 'rotateY(-90deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(5)}
           <Shine />
        </div>
        {/* Face 3 */}
        <div style={{ transform: 'rotateX(90deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(3)}
           <Shine />
        </div>
        {/* Face 4 */}
        <div style={{ transform: 'rotateX(-90deg) translateZ(32px)' }} className={getFaceClass(color)}>
           {renderFaceContent(4)}
           <Shine />
        </div>
      </motion.div>
    </div>
  );
};

const Piece = ({ color, turn, canMove, onClick, id, size = "w-8 h-8", isLeft, players, isFinished }: { 
  color: LudoColor, 
  turn: string, 
  diceValue: number | null, 
  canMove: boolean, 
  onClick: () => void,
  id: string,
  size?: string,
  isLeft?: boolean,
  players: any[],
  isFinished?: boolean
}) => {
  const player = players.find(p => p.color === color);
  const avatarUrl = player?.isBot 
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${color}` 
    : (player?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.uid || color}`);

  return (
    <motion.button
      layoutId={id}
      initial={{ scale: 0, opacity: 0, rotate: -45 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        rotate: 0,
        ...(isFinished ? {
          y: [0, -10, 0],
          rotate: [0, 10, -10, 0]
        } : {})
      }}
      exit={{ scale: 0, opacity: 0, rotate: 45 }}
      whileHover={isLeft ? {} : { scale: 1.15, zIndex: 100 }}
      whileTap={isLeft ? {} : { scale: 0.95 }}
      onClick={isLeft ? undefined : onClick}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        layout: { duration: 0.4, type: "spring", bounce: 0.3 },
        ...(isFinished ? {
           y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
           rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        } : {})
      }}
      className={cn(
        size, "relative group flex items-center justify-center",
        !isLeft && canMove && turn === color ? "cursor-pointer" : "cursor-default",
        "z-10"
      )}
    >
      <div className={cn("absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300", isLeft && "opacity-40 grayscale")}>
        {/* Glow behind the piece when it can move */}
        {!isLeft && canMove && turn === color && (
          <motion.div 
            animate={{ 
              scale: [1, 1.25, 1], 
              opacity: [0.5, 0.8, 0.5],
              rotate: [0, 90, 180, 270, 360]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute w-[150%] h-[150%] rounded-full blur-xl z-0",
              color === 'red' ? "bg-rose-500/60" :
              color === 'blue' ? "bg-blue-500/60" :
              color === 'yellow' ? "bg-yellow-400/60" :
              "bg-green-500/60"
            )}
          />
        )}
        
        {/* Celebration Sparkles for Finished pieces */}
        {isFinished && (
           <motion.div 
             className="absolute"
             animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
             transition={{ duration: 2, repeat: Infinity }}
           >
             {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  animate={{
                    x: [0, (Math.random() - 0.5) * 60],
                    y: [0, (Math.random() - 0.5) * 60],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random()
                  }}
                />
             ))}
           </motion.div>
        )}

        {/* The Piece Structure */}
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Base/Body */}
          <div className={cn(
            "absolute bottom-0 w-[95%] h-[85%] rounded-[35%] border-b-2 border-white/20 shadow-2xl transition-transform duration-300 backdrop-blur-[4px]",
            color === 'red' ? "bg-gradient-to-t from-rose-900/40 via-rose-600/40 to-rose-400/40" :
            color === 'blue' ? "bg-gradient-to-t from-blue-900/40 via-blue-600/40 to-blue-400/40" :
            color === 'yellow' ? "bg-gradient-to-t from-yellow-800/40 via-yellow-500/40 to-yellow-300/40" :
            "bg-gradient-to-t from-green-900/40 via-green-600/40 to-green-400/40",
            !isLeft && canMove && turn === color && "ring-2 ring-white/50 animate-pulse"
          )} />

          {/* Avatar Area (The "Head") */}
          <div className={cn(
            "relative w-[75%] h-[75%] rounded-full border-2 border-white/30 overflow-hidden shadow-lg transform -translate-y-1 transition-all duration-300 backdrop-blur-[4px]",
            color === 'red' ? "bg-rose-500/40" :
            color === 'blue' ? "bg-blue-500/40" :
            color === 'yellow' ? "bg-yellow-500/40" :
            "bg-green-500/40",
            !isLeft && canMove && turn === color ? "scale-110 shadow-2xl brightness-110" : "brightness-100"
          )}>
            <img 
              src={avatarUrl} 
              alt="avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Gloss overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
          </div>

          {/* Ground shadow */}
          <div className="absolute -bottom-1 w-[80%] h-[15%] bg-black/50 blur-[4px] rounded-full -z-10" />
        </div>

        {/* Left/Abandoned Indicator */}
        {isLeft && (
          <div className="absolute inset-0 flex items-center justify-center z-[60] bg-black/20 rounded-full">
            <X className="w-[70%] h-[70%] text-white drop-shadow-lg stroke-[3px]" />
          </div>
        )}
      </div>
    </motion.button>
  );
};

export const Ludo = ({ 
  online, 
  socket, 
  roomId, 
  vsCPU, 
  initialPlayerCount = 2, 
  isSpectator, 
  onBack 
}: { 
  online?: boolean, 
  socket?: Socket | null, 
  roomId?: string, 
  vsCPU?: boolean, 
  initialPlayerCount?: number,
  isSpectator?: boolean,
  onBack: () => void 
}) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  
  const [board, setBoard] = useState<LudoPiece[]>(() => {
    if (!online && !vsCPU) { // Local multiplayer
       const savedStatus = localStorage.getItem('ludo_offline_status');
       if (savedStatus === 'finished') {
         localStorage.removeItem('ludo_offline_board');
         localStorage.removeItem('ludo_offline_turn');
         localStorage.removeItem('ludo_offline_status');
         return createLudoInitialPieces();
       }
       const saved = localStorage.getItem('ludo_offline_board');
       return saved ? JSON.parse(saved) : createLudoInitialPieces();
    }
    if (vsCPU) {
       const savedStatus = localStorage.getItem(`ludo_cpu_${initialPlayerCount}_status`);
       if (savedStatus === 'finished') {
         localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_board`);
         localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_turn`);
         localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_status`);
         return createLudoInitialPieces();
       }
       const saved = localStorage.getItem(`ludo_cpu_${initialPlayerCount}_board`);
       return saved ? JSON.parse(saved) : createLudoInitialPieces();
    }
    return createLudoInitialPieces();
  });
  const [turn, setTurn] = useState<LudoColor>(() => {
    if (!online && !vsCPU) {
       return (localStorage.getItem('ludo_offline_turn') as LudoColor) || 'red';
    }
    if (vsCPU) {
       return (localStorage.getItem(`ludo_cpu_${initialPlayerCount}_turn`) as LudoColor) || 'red';
    }
    return 'red';
  });
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [simulatedDiceValue, setSimulatedDiceValue] = useState<number>(1);
  const [winner, setWinner] = useState<LudoColor | null>(null);
  const [playerColor, setPlayerColor] = useState<LudoColor | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>(() => {
    if (!online) {
      if (vsCPU) {
        return (localStorage.getItem(`ludo_cpu_${initialPlayerCount}_status`) as any) || 'playing';
      }
      return (localStorage.getItem('ludo_offline_status') as any) || 'playing';
    }
    return 'waiting';
  });

  // Persist offline state
  useEffect(() => {
    if (!online) {
      if (vsCPU) {
        localStorage.setItem(`ludo_cpu_${initialPlayerCount}_board`, JSON.stringify(board));
        localStorage.setItem(`ludo_cpu_${initialPlayerCount}_turn`, turn);
        localStorage.setItem(`ludo_cpu_${initialPlayerCount}_status`, status);
      } else {
        localStorage.setItem('ludo_offline_board', JSON.stringify(board));
        localStorage.setItem('ludo_offline_turn', turn);
        localStorage.setItem('ludo_offline_status', status);
      }
    }
  }, [online, vsCPU, initialPlayerCount, board, turn, status]);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [finishedOrder, setFinishedOrder] = useState<LudoColor[]>([]);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const isInitialChatMount = useRef(true);

  // Ensure user profile is in the room's participantsProfiles map
  useEffect(() => {
    if (online && roomId && user && profile && !isSpectator) {
      const syncProfile = async () => {
        try {
          const roomRef = doc(db, 'rooms', roomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const data = snap.data();
            if (!data.participantsProfiles?.[user.uid]) {
              await updateDoc(roomRef, {
                [`participantsProfiles.${user.uid}`]: {
                  uid: user.uid,
                  displayName: profile.displayName || 'Anonymous',
                  photoURL: user.photoURL || null
                }
              });
            }
          }
        } catch (error) {
          console.error("Error syncing profile to Ludo room:", error);
        }
      };
      syncProfile();
    }
  }, [online, roomId, user, profile, isSpectator]);

  const [isCreator, setIsCreator] = useState(false);

  const saveMatch = async (winColor: LudoColor) => {
    if (!user || isSpectator) return;
    
    // Find the current user's player in the game
    const myPlayer = players.find(p => p.uid === user.uid);
    if (!myPlayer) return;
    
    const isWinner = winColor === myPlayer.color;
    
    try {
      let points = isWinner ? 20 : 0;
      
      await updateDoc(doc(db, 'users', user.uid), {
        score: increment(points),
        [`stats.ludo.wins`]: isWinner ? increment(1) : increment(0),
        [`stats.ludo.losses`]: !isWinner ? increment(1) : increment(0),
      });

      // Match Record (Only one player saves in online mode to avoid duplicates)
      if (online) {
        // Simple logic: the first participant in the array (if still present) saves it
        if (players[0].uid !== user.uid) return;
      }

      await addDoc(collection(db, 'matches'), {
        gameType: 'Ludo',
        players: players.map(p => p.uid || 'CPU'),
        vsCPU: !!vsCPU,
        winner: players.find(p => p.color === winColor)?.uid || 'CPU',
        createdAt: serverTimestamp(),
        mode: online ? 'online' : 'vs_cpu',
        score: points
      });
    } catch (error) {
      console.error("Error saving match:", error);
    }
  };

  useEffect(() => {
    if (winner) {
      saveMatch(winner);
    }
  }, [winner]);

  // Sound Management 
  const audioPool = useRef<Record<string, HTMLAudioElement>>({});
  const activeSounds = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    const audioFiles: Record<string, string> = {
      move: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Pop/Bubble
      exit: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Pop
      capture: 'https://assets.mixkit.co/active_storage/sfx/1343/1343-preview.mp3', // Hit
      finish: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Success bell
      win: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Fanfare
      dice: 'https://assets.mixkit.co/active_storage/sfx/2381/2381-preview.mp3' // Clock ticking/metronome sound
    };

    Object.entries(audioFiles).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.loop = false;
      audio.onerror = () => setAudioError(true);
      audioPool.current[key] = audio;
    });

    const unlock = () => {
      setIsAudioUnlocked(true);
      // Play and pause all to unlock
      Object.values(audioPool.current).forEach(a => {
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      });
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      // Stop and clear all active audio clones
      activeSounds.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      activeSounds.current = [];
    };
  }, []);

  const playSound = (type: 'move' | 'exit' | 'capture' | 'finish' | 'win' | 'dice') => {
    if (isMuted) return;
    const sfx = audioPool.current[type];
    if (sfx) {
      try {
        const playInstance = sfx.cloneNode() as HTMLAudioElement;
        playInstance.volume = (type === 'move' || type === 'dice') ? 0.6 : 0.8;
        playInstance.loop = false;
        
        activeSounds.current.push(playInstance);
        
        // Safety timeout to cleanup after 4 seconds anyway (no sound is longer than that)
        const safetyTimeout = setTimeout(() => {
          if (playInstance) {
            playInstance.pause();
            playInstance.src = '';
            activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
          }
        }, 4000);

        playInstance.onended = () => {
          clearTimeout(safetyTimeout);
          activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
          playInstance.src = ''; // Force cleanup
        };

        const playPromise = playInstance.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            clearTimeout(safetyTimeout);
            activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
            if (e.name === 'NotAllowedError') setAudioError(true);
          });
        }
      } catch (err) {
        console.error("Sound play error", err);
      }
    }
  };

  const confirmExit = async () => {
    if (online && roomId && user) {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const data = roomSnap.data();
          const currentParticipants = data.participants || [];
          
          if (currentParticipants.includes(user.uid)) {
            const updatedParticipants = currentParticipants.filter((uid: string) => uid !== user.uid);
            
            if (updatedParticipants.length === 0) {
              await deleteDoc(roomRef);
            } else {
              const isMyTurn = data.status === 'playing' && data.gameState?.turn === playerColor;
              let nextTurn = data.gameState?.turn;

              if (isMyTurn && data.gameState?.playerMapping && data.gameState?.initialParticipants) {
                const colors: LudoColor[] = data.gameState.initialParticipants.map((uid: string) => data.gameState.playerMapping[uid]);
                let nextIdx = (colors.indexOf(playerColor!) + 1) % colors.length;
                let attempts = 0;
                const finished = data.gameState.finishedOrder || [];
                // Skip finished players AND players who are about to be gone (including me)
                while ((finished.includes(colors[nextIdx]) || !updatedParticipants.includes(data.gameState.initialParticipants[nextIdx])) && attempts < colors.length) {
                  nextIdx = (nextIdx + 1) % colors.length;
                  attempts++;
                }
                nextTurn = colors[nextIdx];
              }

              const updatePayload: any = {
                participants: updatedParticipants,
                participantCount: increment(-1),
                ...(isMyTurn ? { 'gameState.turn': nextTurn, 'gameState.diceValue': null } : {}),
                // If creator left, assign new creator
                ...(data.creatorId === user.uid ? { creatorId: updatedParticipants[0] } : {})
              };

              // If exactly two players were in the room and one leaves, the survivor wins 1st place
              if (data.status === 'playing' && currentParticipants.length === 2 && updatedParticipants.length === 1 && data.gameState?.playerMapping) {
                const winnerUid = updatedParticipants[0];
                const winColor = data.gameState.playerMapping[winnerUid];
                if (winColor) {
                  updatePayload.status = 'finished';
                  updatePayload['gameState.winner'] = winColor;
                  updatePayload['gameState.finishedOrder'] = [winColor];
                }
              }

              await updateDoc(roomRef, updatePayload);
            }
          }
        }
      } catch (err) {
        console.error("Error leaving room:", err);
      }
    }
    // Clear offline persistence
    if (vsCPU) {
      localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_board`);
      localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_turn`);
      localStorage.removeItem(`ludo_cpu_${initialPlayerCount}_status`);
    } else {
      localStorage.removeItem('ludo_offline_board');
      localStorage.removeItem('ludo_offline_turn');
      localStorage.removeItem('ludo_offline_status');
    }
    onBack();
  };

  const handleExitClick = () => {
    if ((online || vsCPU) && !winner) {
      setShowExitConfirm(true);
    } else {
      confirmExit();
    }
  };

  // Chat unread counter
  useEffect(() => {
    if (online && roomId && !showChat) {
      const q = query(collection(db, 'messages'), where('roomId', '==', roomId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (isInitialChatMount.current) {
          isInitialChatMount.current = false;
          return;
        }
        
        const changes = snapshot.docChanges();
        const newMessages = changes.filter(change => 
          change.type === 'added' && 
          change.doc.data().senderId !== user?.uid
        );

        if (newMessages.length > 0) {
          setUnreadCount(prev => prev + newMessages.length);
        }
      });
      return () => unsubscribe();
    } else if (showChat) {
      setUnreadCount(0);
      isInitialChatMount.current = true;
    }
  }, [online, roomId, showChat, user]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef({ board, turn, diceValue, status, players, playerColor });

  useEffect(() => {
    gameRef.current = { board, turn, diceValue, status, players, playerColor };
  }, [board, turn, diceValue, status, players, playerColor]);

  // Initial setup for VS CPU
  useEffect(() => {
    if (vsCPU) {
      const colors: LudoColor[] = initialPlayerCount === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
      const initialPlayers = colors.map((color, i) => ({
        uid: i === 0 ? user?.uid : `bot-${color}`,
        color,
        displayName: i === 0 ? (profile?.displayName || 'Player') : `Bot ${i}`,
        isBot: i !== 0,
        photoURL: i === 0 ? profile?.photoURL : null
      }));
      setPlayers(initialPlayers);
      setBoard(createLudoInitialPieces(colors));
      setPlayerColor('red');
      setStatus('playing');
    }
  }, [vsCPU, initialPlayerCount]);

  // Turn Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'playing' && !winner && !isRolling) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // If timer expires and player hasn't rolled, roll for them.
            // Otherwise, if they rolled but didn't move, execute an auto-move.
            if (diceValue === null) {
              rollDice();
            } else {
              executeAutoMove();
            }
            return TURN_TIME;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, winner, turn, isRolling, diceValue]);

  // Reset timer on turn change or dice roll
  useEffect(() => {
    setTimeLeft(TURN_TIME);
  }, [turn, diceValue]);

  // CPU Turn handler
  useEffect(() => {
    if (vsCPU && status === 'playing' && !winner) {
      const currentPlayer = players.find(p => p.color === turn);
      if (currentPlayer?.isBot) {
        const botTimer = setTimeout(async () => {
          if (diceValue === null && !isRolling) {
            // Roll dice for bot
            await rollDiceForBot();
          } else if (diceValue !== null && !isRolling) {
            // Choose a piece to move
            const botPieces = board.filter(p => p.color === turn);
            const legalPieces = botPieces.filter(p => canMovePiece(p, diceValue));
            
            if (legalPieces.length > 0) {
              // Priority: piece that is closest to finishing or can enter the board
              const bestPiece = legalPieces.sort((a, b) => {
                if (a.position === 'home' && b.position !== 'home') return -1;
                if (b.position === 'home' && a.position !== 'home') return 1;
                const posA = typeof a.position === 'number' ? a.position : -1;
                const posB = typeof b.position === 'number' ? b.position : -1;
                return posB - posA;
              })[0];
              
              setTimeout(() => handlePieceClick(bestPiece), 800);
            } else {
              // No legal moves - Wait to let player see the value
              setTimeout(() => skipTurn(), 1500);
            }
          }
        }, 1500);
        return () => clearTimeout(botTimer);
      }
    }
  }, [vsCPU, turn, diceValue, isRolling, status, winner, players, board]);

  const rollDiceForBot = async () => {
    if (isRolling) return;
    setIsRolling(true);
    playSound('dice');
    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), { 'gameState.isRolling': true });
    }

    for (let i = 0; i < 15; i++) {
       setSimulatedDiceValue(Math.floor(Math.random() * 6) + 1);
       await new Promise(r => setTimeout(r, 80));
    }
    const finalValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalValue);
    setSimulatedDiceValue(finalValue);
    setIsRolling(false);
    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), { 
        'gameState.diceValue': finalValue,
        'gameState.isRolling': false 
      });
    }
  };
  // Online listener
  useEffect(() => {
    if (online && roomId) {
      const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.accessCode) setAccessCode(data.accessCode);
          if (data.gameState) {
            const currentPlayers = data.participants || [];
            const activeColors: LudoColor[] = currentPlayers.length === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'].slice(0, currentPlayers.length) as LudoColor[];
            setBoard(data.gameState.pieces || createLudoInitialPieces(activeColors));
            setTurn(data.gameState.turn || 'red');
            setDiceValue(data.gameState.diceValue || null);
            setIsRolling(data.gameState.isRolling || false);
            setWinner(data.gameState.winner || null);
            setFinishedOrder(data.gameState.finishedOrder || []);
            setStatus(data.status || 'waiting');
            setIsMoving(data.gameState.isMoving || false);
          } else {
            // Room exists but game hasn't started yet
            setStatus(data.status || 'waiting');
          }
          if (data.participants) {
            const currentParticipants = data.participants || [];
            const profiles = data.participantsProfiles || {};
            
            // If game has started, use the fixed mapping from gameState.
            // Otherwise fallback to join-order mapping (for lobby).
            let mappedPlayers;
            if (data.gameState?.playerMapping && data.gameState?.initialParticipants) {
              const mapping = data.gameState.playerMapping;
              mappedPlayers = data.gameState.initialParticipants.map((uid: string) => ({
                uid,
                color: mapping[uid],
                displayName: profiles[uid]?.displayName || 'Anonymous',
                isBot: false,
                photoURL: profiles[uid]?.photoURL,
                isLeft: !currentParticipants.includes(uid)
              }));
            } else {
              // Assign colors based on join order. For 2 players, use diametrically opposite colors.
              const colors: LudoColor[] = currentParticipants.length === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
              mappedPlayers = currentParticipants.map((uid: string, i: number) => ({
                uid,
                color: colors[i],
                displayName: profiles[uid]?.displayName || 'Anonymous',
                isBot: false,
                photoURL: profiles[uid]?.photoURL,
                isLeft: false
              }));
            }
            
            setPlayers(mappedPlayers);
            
            const myPlayer = mappedPlayers.find((p: any) => p.uid === user?.uid);
            if (myPlayer) setPlayerColor(myPlayer.color);
          }
          setIsCreator(data.creatorId === user?.uid);
        }
      });
      return () => unsubscribe();
    }
  }, [online, roomId, user?.uid]);

  const startGame = async () => {
    if (!online || !roomId || !isCreator || players.length < 2) return;
    
    try {
      const activeColors: LudoColor[] = players.length === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'].slice(0, players.length) as LudoColor[];
      
      const playerMapping: Record<string, LudoColor> = {};
      players.forEach((p, i) => {
        playerMapping[p.uid] = activeColors[i];
      });

      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'playing',
        'gameState.pieces': createLudoInitialPieces(activeColors),
        'gameState.turn': 'red',
        'gameState.diceValue': null,
        'gameState.isRolling': false,
        'gameState.winner': null,
        'gameState.finishedOrder': [],
        'gameState.lastActionAt': serverTimestamp(),
        'gameState.playerMapping': playerMapping,
        'gameState.initialParticipants': players.map(p => p.uid)
      });
    } catch (error) {
      showError('Falha ao iniciar o jogo. Tente novamente.');
    }
  };

  const getPlayerProgress = (color: LudoColor) => {
    const pieces = board.filter(p => p.color === color);
    if (pieces.length === 0) return 0;
    
    // Total steps to reach finish is 56 (51 board squares + 5 home stretch squares)
    // finish is the final state.
    const totalSteps = pieces.reduce((acc, p) => {
      if (p.position === 'home') return acc;
      if (p.position === 'finish') return acc + 56;
      if (typeof p.position === 'number') return acc + (p.position + 1);
      return acc;
    }, 0);
    
    const maxPossible = 4 * 56;
    return Math.min(100, Math.round((totalSteps / maxPossible) * 100));
  };

  const executeAutoMove = () => {
    const currentPieces = board.filter(p => p.color === turn);
    const legalPieces = currentPieces.filter(p => canMovePiece(p, diceValue || 0));
    
    if (legalPieces.length > 0) {
      // Priority: piece that is closest to finishing or can enter the board
      const pieceToMove = legalPieces.sort((a, b) => {
        if (a.position === 'home' && b.position !== 'home') return -1;
        if (b.position === 'home' && a.position !== 'home') return 1;
        const posA = typeof a.position === 'number' ? a.position : -1;
        const posB = typeof b.position === 'number' ? b.position : -1;
        return posB - posA;
      })[0];
      handlePieceClick(pieceToMove);
    } else {
      // If we rolled a 6 but have no legal moves (rare later in game), give another roll
      if (diceValue === 6) {
        setDiceValue(null);
        setTimeLeft(TURN_TIME);
      } else {
        // Delay skip to let player see the dice before it resets
        setTimeout(() => skipTurn(), 1000);
      }
    }
  };

  const rollDice = async () => {
    if (status !== 'playing' || isRolling || winner || isSpectator || (diceValue !== null)) return;
    
    // Check if it's the current player's turn (in VS CPU or Online)
    const currentPlayer = players.find(p => p.color === turn);
    if (!currentPlayer) return;
    
    // In VS CPU, only allow human to roll if it's their color. Bots roll automatically.
    if (vsCPU && currentPlayer.isBot) return;
    
    // In Online, only allow human to roll if it's their assigned color.
    if (online && turn !== playerColor) return;

    setIsRolling(true);
    playSound('dice');
    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), { 'gameState.isRolling': true, 'gameState.diceValue': null });
    }

    // Simulate roll animation
    for (let i = 0; i < 15; i++) {
       setSimulatedDiceValue(Math.floor(Math.random() * 6) + 1);
       await new Promise(r => setTimeout(r, 80));
    }
    
    const finalValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalValue);
    setSimulatedDiceValue(finalValue);
    setIsRolling(false);

    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), {
        'gameState.diceValue': finalValue,
        'gameState.isRolling': false
      });
    }

    // Check if player has any legal moves
    const currentPieces = board.filter(p => p.color === turn);
    const hasLegalMoves = currentPieces.some(p => canMovePiece(p, finalValue));

    if (!hasLegalMoves) {
       // Wait 1.5s to let the player realize no move is possible
       if (finalValue === 6) {
         setTimeout(async () => {
           setDiceValue(null);
           setTimeLeft(TURN_TIME);
           if (online && roomId && !isSpectator) {
             await updateDoc(doc(db, 'rooms', roomId), {
               'gameState.diceValue': null
             });
           }
         }, 1500);
       } else {
         setTimeout(() => skipTurn(), 1500);
       }
    }
  };

  const skipTurn = async () => {
    const nextColors: LudoColor[] = players.map(p => p.color);
    const currentIndex = nextColors.indexOf(turn);
    const nextTurn = nextColors[(currentIndex + 1) % nextColors.length];
    
    setDiceValue(null);
    setTurn(nextTurn);
    setTimeLeft(TURN_TIME);

    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), {
        'gameState.turn': nextTurn,
        'gameState.diceValue': null
      });
    }
  };

  const canMovePiece = (piece: LudoPiece, roll: number): boolean => {
    if (piece.position === 'finish') return false;
    if (piece.position === 'home') return roll === 6 || roll === 1;
    
    if (typeof piece.position === 'number') {
       const nextPos = piece.position + roll;
       return nextPos <= 56; // 51 board steps + 5 home stretch steps
    }
    return false;
  };

  const handlePieceClick = async (piece: LudoPiece) => {
    if (status !== 'playing' || isSpectator || winner || isRolling || diceValue === null || isMoving) return;
    if (turn !== playerColor && !vsCPU) return;
    if (piece.color !== turn) return;
    if (!canMovePiece(piece, diceValue)) return;

    setIsMoving(true);
    if (online && roomId && !isSpectator) {
      await updateDoc(doc(db, 'rooms', roomId), { 'gameState.isMoving': true });
    }

    movePiece(piece, diceValue);
  };

  const movePiece = async (piece: LudoPiece, roll: number) => {
    let currentPiece = { ...piece };
    // Special rule: Coming out of home only moves to index 0, regardless of the roll (which is 6)
    const rollCount = piece.position === 'home' ? 1 : roll;

    if (piece.position === 'home') playSound('exit');
    
    // Step by step movement for animation
    for (let i = 1; i <= rollCount; i++) {
      let nextPos: number | 'finish';
      
      if (currentPiece.position === 'home') {
        nextPos = 0;
      } else {
        const currentNum = typeof currentPiece.position === 'number' ? currentPiece.position : 0;
        const target = currentNum + 1;
        nextPos = target === 56 ? 'finish' : target;
      }
      
      const intermediateBoard = board.map(p => 
        p.id === currentPiece.id ? { ...p, position: nextPos } : p
      );
      
      setBoard(intermediateBoard);
      currentPiece.position = nextPos;
      
      playSound('move');

      // Delay for "hopping" feel
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (nextPos === 'finish') break;
    }

    const pieceAfterMove = currentPiece;
    const finalCoords = getPieceCoords(pieceAfterMove);
    const actualFinalPos = typeof pieceAfterMove.position === 'number' ? pieceAfterMove.position : -1;
    const pathIndex = actualFinalPos >= 0 && actualFinalPos < 51 ? (COLOR_OFFSETS[pieceAfterMove.color] + actualFinalPos) % 52 : -1;
    const isSafeSquare = SAFE_SQUARES.includes(pathIndex);

    let hasCaptured = false;
    const updatedBoard = board.map(p => {
      if (p.id === pieceAfterMove.id) return pieceAfterMove;
      
      // CAPTURE logic: Check other pieces
      if (p.color !== turn && typeof p.position === 'number' && p.position < 51 && finalCoords && !isSafeSquare) {
        const pCoords = getPieceCoords(p);
        if (pCoords && pCoords[0] === finalCoords[0] && pCoords[1] === finalCoords[1]) {
          hasCaptured = true;
          return { ...p, position: 'home' as const };
        }
      }
      return p;
    });

    setBoard(updatedBoard);
    
    if (hasCaptured) playSound('capture');

    // Check for win
    const playerPieces = updatedBoard.filter(p => p.color === turn);
    const reachedFinish = pieceAfterMove.position === 'finish';

    if (reachedFinish && !playerPieces.every(p => p.position === 'finish')) {
      playSound('finish');
    }

    let newFinishedOrder = [...finishedOrder];
    if (playerPieces.every(p => p.position === 'finish') && !newFinishedOrder.includes(turn)) {
      playSound('win');
      newFinishedOrder.push(turn);
      setFinishedOrder(newFinishedOrder);

      const activeColors = players.map(p => p.color);
      const remaining = activeColors.filter(c => !newFinishedOrder.includes(c));

      if (remaining.length <= 1) {
        setWinner(newFinishedOrder[0]);
        setStatus('finished');
      }
    }

    if (status !== 'finished' && !winner) {
      // Turn logic: Extra turn if roll is 6 OR exiting home with 1 OR reached finish OR captured a piece
      const exitedHomeWithOne = roll === 1 && piece.position === 'home';
      const extraTurn = roll === 6 || exitedHomeWithOne || reachedFinish || hasCaptured;
      
      if (extraTurn && !playerPieces.every(p => p.position === 'finish')) {
        setDiceValue(null);
        setIsMoving(false);
        setTimeLeft(TURN_TIME);
      } else {
        const nextColors: LudoColor[] = players.map(p => p.color);
        let nextIndex = (nextColors.indexOf(turn) + 1) % nextColors.length;
        // Skip players who finished OR left
        let attempts = 0;
        while ((newFinishedOrder.includes(nextColors[nextIndex]) || players.find(p => p.color === nextColors[nextIndex])?.isLeft) && attempts < nextColors.length) {
          nextIndex = (nextIndex + 1) % nextColors.length;
          attempts++;
        }

        const nextTurn = nextColors[nextIndex];
        setTurn(nextTurn);
        setDiceValue(null);
        setIsMoving(false);
        setTimeLeft(TURN_TIME);
      }
    } else {
      // Even if game is finished, reset move state
      setIsMoving(false);
    }

    if (online && roomId && !isSpectator) {
      const win = newFinishedOrder.length >= players.length - 1 ? newFinishedOrder[0] : null;
      const exitedHomeWithOne = roll === 1 && piece.position === 'home';
      const reachedFinish = pieceAfterMove.position === 'finish';
      const extraTurn = roll === 6 || exitedHomeWithOne || reachedFinish || hasCaptured;
      const nextColors = players.map(p => p.color);
      
      let nextIndex = (nextColors.indexOf(turn) + 1) % nextColors.length;
      let attempts = 0;
      while ((newFinishedOrder.includes(nextColors[nextIndex]) || players.find(p => p.color === nextColors[nextIndex])?.isLeft) && attempts < nextColors.length) {
        nextIndex = (nextIndex + 1) % nextColors.length;
        attempts++;
      }
      
      const nextTurn = (extraTurn && !playerPieces.every(p => p.position === 'finish')) ? turn : nextColors[nextIndex];

      await updateDoc(doc(db, 'rooms', roomId), {
        'gameState.pieces': updatedBoard,
        'gameState.turn': nextTurn,
        'gameState.diceValue': null,
        'gameState.winner': win,
        'gameState.finishedOrder': newFinishedOrder,
        'gameState.isMoving': false,
        status: (newFinishedOrder.length >= players.length - 1) ? 'finished' : 'playing'
      });
    }
  };

  const getPieceCoords = (piece: LudoPiece) => {
    if (piece.position === 'home') return null;
    if (piece.position === 'finish') {
      // Map finish area to colored triangles in the center 3x3
      const finishMap: Record<LudoColor, [number, number]> = {
        'green': [6.4, 7],
        'red': [7, 6.4],
        'yellow': [7, 7.6],
        'blue': [7.6, 7]
      };
      return finishMap[piece.color];
    }
    if (typeof piece.position === 'number') {
      const pos = piece.position;
      if (pos < 51) {
        const actualIndex = (COLOR_OFFSETS[piece.color] + pos) % 52;
        return BOARD_PATH[actualIndex];
      } else {
        const step = pos - 50; // 1 to 5
        const stretchMap: Record<LudoColor, [number, number]> = {
          'green': [step, 7],
          'yellow': [7, 14 - step],
          'blue': [14 - step, 7],
          'red': [7, step]
        };
        return stretchMap[piece.color];
      }
    }
    return null;
  };

  const renderPiecesOnBoard = () => {
    const piecesOnBoard = board.filter(p => typeof p.position === 'number' || p.position === 'finish');
    
    const groups: Record<string, LudoPiece[]> = {};
    piecesOnBoard.forEach(p => {
      const coords = getPieceCoords(p);
      if (coords) {
        const key = `${coords[0]},${coords[1]}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      }
    });

    return Object.entries(groups).map(([key, group]) => {
      const [r, c] = key.split(',').map(Number);
      return (
        <div 
          key={key} 
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            top: `${(r / 15) * 100}%`,
            left: `${(c / 15) * 100}%`,
            width: `${(1 / 15) * 100}%`,
            height: `${(1 / 15) * 100}%`,
          }}
        >
          <div className="w-full h-full flex flex-wrap items-center justify-center p-0.5 pointer-events-auto">
            <AnimatePresence mode="popLayout">
               {group.map((piece) => {
                 const pieceOwner = players.find(p => p.color === piece.color);
                 return (
                  <div key={piece.id} className={group.length > 1 ? "w-1/2 h-1/2 p-0.5" : "w-full h-full p-0.5"}>
                    <Piece 
                      id={piece.id}
                      color={piece.color}
                      turn={turn}
                      diceValue={diceValue}
                      canMove={!pieceOwner?.isLeft && status === 'playing' && canMovePiece(piece, diceValue || 0)}
                      onClick={() => handlePieceClick(piece)}
                      isLeft={pieceOwner?.isLeft}
                      size="w-full h-full"
                      players={players}
                      isFinished={piece.position === 'finish'}
                    />
                  </div>
                 );
               })}
            </AnimatePresence>
          </div>
        </div>
      );
    });
  };
  const renderDice = () => {
    return (
      <div className="flex flex-col items-center gap-4">
        <div 
          className="cursor-pointer relative group"
          onClick={rollDice}
        >
          {/* Dice Tray / Shadow Effect */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-black/40 blur-xl rounded-full scale-110 opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <Dice3D value={isRolling ? simulatedDiceValue : diceValue} rolling={isRolling} color={turn} />
        </div>
        {!isSpectator && status === 'playing' && turn === playerColor && diceValue === null && !isRolling && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest animate-pulse",
              turn === 'red' ? 'text-rose-400' : 
              turn === 'green' ? 'text-green-400' :
              turn === 'yellow' ? 'text-yellow-400' :
              'text-blue-400'
            )}
          >
            tap to roll
          </motion.p>
        )}
      </div>
    );
  };

  const renderPlayerAvatar = (color: LudoColor, size: string = "w-14 h-14") => {
    const player = players.find(p => p.color === color);
    const isHuman = player && !player.isBot;
    const isLeft = player?.isLeft;

    const botAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${color}`;
    
    const bgColor = color === 'red' ? 'bg-rose-500' :
                    color === 'green' ? 'bg-green-500' :
                    color === 'blue' ? 'bg-blue-500' : 'bg-yellow-500';

    return (
      <div className={cn(
        size, 
        "rounded-full overflow-hidden shadow-xl border-2 border-white/20 flex items-center justify-center shrink-0 relative", 
        bgColor,
        isLeft && "grayscale opacity-60"
      )}>
        <img 
          src={isHuman 
            ? (player?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.uid}`)
            : botAvatarUrl
          } 
          alt={player?.displayName || color} 
          referrerPolicy="no-referrer" 
          className="w-full h-full object-cover" 
        />
        {isLeft && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
             <X className="w-1/2 h-1/2 text-white stroke-[4px]" />
          </div>
        )}
      </div>
    );
  };

  const renderPlayersStatus = (isMobile: boolean = false) => (
    <div className={cn(
      "flex flex-col gap-4 w-full",
      isMobile ? "max-w-[650px] mx-auto" : ""
    )}>
      <h3 className="text-white/40 text-[11px] sm:text-xs font-black uppercase tracking-widest px-2">Players Status</h3>
      <div className={cn("grid gap-4 sm:gap-6 lg:gap-3 w-full", isMobile ? "grid-cols-2" : "flex flex-col")}>
        {players.map((p) => {
          const progress = getPlayerProgress(p.color);
          const isCurrentTurn = turn === p.color;
          const colorClasses = {
            red: "border-rose-500/30 text-rose-500",
            blue: "border-blue-500/30 text-blue-500",
            yellow: "border-yellow-500/30 text-yellow-500",
            green: "border-green-500/30 text-green-500"
          };
          const activeColorClasses = {
            red: "border-rose-500 shadow-rose-500/20 bg-rose-500/5",
            blue: "border-blue-500 shadow-blue-500/20 bg-blue-500/5",
            yellow: "border-yellow-500 shadow-yellow-500/20 bg-yellow-500/5",
            green: "border-green-500 shadow-green-500/20 bg-green-500/5"
          };

          return (
            <div key={p.uid} className={cn(
              "flex flex-col gap-2 p-2.5 sm:p-4 rounded-2xl transition-all border min-h-[80px] sm:min-h-[100px] justify-center w-full",
              isCurrentTurn 
                ? cn("bg-white/10 scale-105 shadow-xl z-10", activeColorClasses[p.color]) 
                : cn("bg-white/5", colorClasses[p.color])
            )}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {renderPlayerAvatar(p.color, "w-8 h-8 sm:w-10 sm:h-10")}
                  {isCurrentTurn && (
                    <motion.div 
                      layoutId="active-turn-glow"
                      className={cn(
                        "absolute -inset-1 rounded-full blur-md opacity-40 animate-pulse",
                        p.color === 'red' ? 'bg-rose-500' : 
                        p.color === 'green' ? 'bg-green-500' :
                        p.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      )}
                    />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 justify-between">
                    <span className="text-xs sm:text-sm font-bold text-white truncate pr-1">{p.displayName}</span>
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      p.color === 'red' ? 'bg-rose-500' : 
                      p.color === 'green' ? 'bg-green-500' :
                      p.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    )} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 min-w-[20px] bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full transition-all duration-500",
                          p.color === 'red' ? "bg-rose-500" :
                          p.color === 'blue' ? "bg-blue-500" :
                          p.color === 'yellow' ? "bg-yellow-500" :
                          "bg-green-500"
                        )}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/40 font-black tracking-widest shrink-0">{progress}%</span>
                  </div>
                </div>
              </div>
              <div className="h-3 sm:h-4 flex items-center justify-center">
                {isCurrentTurn && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-[9px] sm:text-[10px] font-black italic uppercase animate-pulse text-center",
                      p.color === 'red' ? 'text-rose-400' : 
                      p.color === 'green' ? 'text-green-400' :
                      p.color === 'yellow' ? 'text-yellow-400' :
                      'text-blue-400'
                    )}
                  >
                    {p.color} turn
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-50 relative">
        <button 
          onClick={handleExitClick}
          className="flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase"
        >
          <X className="w-5 h-5" />
          <span className="hidden min-[450px]:inline">EXIT GAME</span>
          <span className="min-[450px]:hidden">EXIT</span>
        </button>

        {isSpectator && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-2xl text-purple-400">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest italic">Spectator Mode</span>
          </div>
        )}

        {online && accessCode && !isSpectator && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
            <Lock className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-40">Code:</span>
            <span className="text-sm font-mono font-bold text-blue-400 select-all">{accessCode}</span>
          </div>
        )}
        
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2 rounded-xl border transition-all flex items-center gap-2 relative",
              isMuted ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-white/5 border-white/10 text-white/60 hover:text-white",
              audioError && "animate-pulse border-rose-500"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            {audioError && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}
          </button>
          <button 
            onClick={() => setShowRules(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
          >
            <HelpCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-[10px] font-black tracking-widest uppercase hidden sm:inline">Rules</span>
          </button>
          {online && (
            <button 
              onClick={() => setShowChat(!showChat)}
              className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
            >
              <MessageSquare className="w-5 h-5 text-blue-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold flex items-center justify-center rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pt-12 lg:pt-24 px-4 pb-20 overflow-y-auto">
        <AnimatePresence>
          {/* Audio activation overlay removed - silent unlock on first click */}
        </AnimatePresence>
        
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-center pb-20">
          
          {/* Mobile Status (Above Board) */}
          <div className="lg:hidden w-full px-4 order-1">
            {renderPlayersStatus(true)}
          </div>

          {/* Left: Dice Controls (Desktop) / Bottom Dice (Mobile) */}
          <div className="lg:col-span-3 lg:order-1 order-3 px-4 lg:px-0 flex justify-center">
             <div className={cn(
               "relative flex flex-col items-center",
               "sm:bg-white/5 sm:backdrop-blur-md sm:border sm:border-white/10 sm:rounded-2xl sm:shadow-2xl",
               "p-4 sm:p-6 lg:p-8",
               "gap-4 sm:gap-8",
               "w-full sm:w-auto min-w-[120px] sm:min-w-[240px]"
             )}>
                {/* Circling Timer SVG Overlay - Visible only on Desktop/Tablet */}
                {!isRolling && (
                  <svg 
                    viewBox="0 0 100 100"
                    className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none -rotate-90 overflow-visible"
                    style={{ filter: timeLeft < 10 ? 'drop-shadow(0 0 15px rgba(244, 63, 94, 0.4))' : 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.4))' }}
                  >
                     <circle 
                        cx="50" cy="50" r="48"
                        fill="transparent" 
                        stroke="rgba(255,255,255,0.03)" 
                        strokeWidth="2" 
                     />
                     <motion.circle 
                        cx="50" cy="50" r="48"
                        fill="transparent" 
                        stroke={timeLeft < 10 ? "#f43f5e" : "#3b82f6"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 1 }}
                        animate={{
                          pathLength: timeLeft / TURN_TIME,
                        }}
                        transition={{
                          duration: 1, ease: "linear"
                        }}
                     />
                  </svg>
                )}

                <div className="scale-75 sm:scale-90 lg:scale-100 origin-center relative z-10 transition-transform">
                  {renderDice()}
                </div>
                
                {!isRolling && status !== 'finished' && (
                  <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                    <span className={cn(
                      "font-mono font-black text-lg sm:text-xl transition-colors",
                      timeLeft < 10 ? "text-rose-500 animate-pulse" : "text-white"
                    )}>
                      {timeLeft}s
                    </span>
                    <div className="h-3 sm:h-4 w-[1px] bg-white/10" />
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-black uppercase tracking-widest animate-pulse",
                      turn === 'red' ? 'text-rose-400' : 
                      turn === 'green' ? 'text-green-400' :
                      turn === 'yellow' ? 'text-yellow-400' :
                      'text-blue-400'
                    )}>
                      {turn} turn {players.find(p => p.color === turn)?.isLeft ? '(left)' : ''}
                    </span>
                  </div>
                )}

                {status === 'finished' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full pt-4 sm:pt-6 relative z-20"
                  >
                    <button
                      onClick={onBack}
                      className="w-full py-3 sm:py-4 rounded-xl font-black uppercase tracking-[0.1em] text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40 active:scale-95"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>VOLTAR AO INÍCIO</span>
                    </button>
                    <div className="mt-2 text-center">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/30 italic">Fim de jogo</p>
                    </div>
                  </motion.div>
                )}
             </div>
          </div>

          {/* Center: Ludo Board */}
          <div className="lg:col-span-6 flex flex-col items-center gap-8 pt-28 sm:pt-40 lg:pt-20 pb-24 lg:pb-12 order-2 px-0">
             
             {/* Lobby Status Message (Above Board) */}
             {online && status === 'waiting' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full text-center"
                >
                  <motion.p 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-[10px] sm:text-xs font-black italic tracking-[0.3em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)] lowercase"
                  >
                    {players.length < 2 
                      ? "aguardando por oponentes..." 
                       : `${players.length} jogadores na sala`
                    }
                  </motion.p>
                </motion.div>
             )}
                 {/* Player Labels / Avatars in corners inspiried by the image */}
              <div className="w-full max-w-[600px] relative">
                      {/* Corner Avatars - Refined with Glassmorphism */}
                      <div className="absolute -top-20 sm:-top-32 lg:-top-28 left-0 flex flex-col items-center z-20">
                         {players.some(p => p.color === 'red') ? (
                           <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                             {renderPlayerAvatar('red', "w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16")}
                             <p className="font-black text-white italic uppercase tracking-tighter text-[9px] sm:text-[10px] lg:text-[11px] drop-shadow-md">{players.find(p => p.color === 'red')?.displayName || 'YOU'}</p>
                           </div>
                         ) : (
                           <div className="w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 rounded-2xl border-2 border-white/5 bg-slate-900/40 backdrop-blur-sm" />
                         )}
                      </div>
                      <div className="absolute -top-20 sm:-top-32 lg:-top-28 right-0 flex flex-col items-center z-20">
                         {players.some(p => p.color === 'green') ? (
                           <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                             {renderPlayerAvatar('green', "w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16")}
                             <p className="font-black text-white italic uppercase tracking-tighter text-[9px] sm:text-[10px] lg:text-[11px] drop-shadow-md">{players.find(p => p.color === 'green')?.displayName}</p>
                           </div>
                         ) : (
                           <div className="w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 rounded-2xl border-2 border-white/5 bg-slate-900/40 backdrop-blur-sm" />
                         )}
                      </div>
                      <div className="absolute -bottom-20 sm:-bottom-32 lg:-bottom-28 left-0 flex flex-col items-center z-20">
                         {players.some(p => p.color === 'blue') ? (
                           <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                             {renderPlayerAvatar('blue', "w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16")}
                             <p className="font-black text-white italic uppercase tracking-tighter text-[9px] sm:text-[10px] lg:text-[11px] drop-shadow-md">{players.find(p => p.color === 'blue')?.displayName}</p>
                           </div>
                         ) : (
                           <div className="w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 rounded-2xl border-2 border-white/5 bg-slate-900/40 backdrop-blur-sm" />
                         )}
                      </div>
                      <div className="absolute -bottom-20 sm:-bottom-32 lg:-bottom-28 right-0 flex flex-col items-center z-20">
                         {players.some(p => p.color === 'yellow') ? (
                           <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                             {renderPlayerAvatar('yellow', "w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16")}
                             <p className="font-black text-white italic uppercase tracking-tighter text-[9px] sm:text-[10px] lg:text-[11px] drop-shadow-md">{players.find(p => p.color === 'yellow')?.displayName}</p>
                           </div>
                         ) : (
                           <div className="w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 rounded-2xl border-2 border-white/5 bg-slate-900/40 backdrop-blur-sm" />
                         )}
                      </div>

                {/* Board Container - Refined with Pattern and Elevation */}
                <div className="relative aspect-square w-full rounded-[32px] sm:rounded-[48px] overflow-hidden border-8 border-slate-900 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5),0_18px_36px_-18px_rgba(0,0,0,0.5)] bg-slate-900 group">
                  {/* Subtle Texture Overlay */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-10" />
                  
                  <div 
                    className="w-full h-full grid relative bg-slate-900"
                    style={{
                      gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                      gridTemplateRows: 'repeat(15, minmax(0, 1fr))'
                    }}
                  >
                    {/* Rendered Board via Grid Cells */}
                  
                  {/* Board Layout Grid Cells */}
                  {Array(15*15).fill(0).map((_, i) => {
                    const r = Math.floor(i / 15);
                    const c = i % 15;
                    
                    let cellColor = "bg-white/95";
                    let isSpecial = false;
                    let specialColor = "";
                    let isSafe = false;
                    
                    // Homes (Deep Gradients)
                    if (r < 6 && c < 6) { cellColor = "bg-rose-600"; isSpecial = true; }
                    if (r < 6 && c > 8) { cellColor = "bg-green-600"; isSpecial = true; }
                    if (r > 8 && c < 6) { cellColor = "bg-blue-600"; isSpecial = true; }
                    if (r > 8 && c > 8) { cellColor = "bg-yellow-500"; isSpecial = true; }
                    
                    // Starting Squares
                    const isStartSquare = (r === 6 && c === 1) || (r === 1 && c === 8) || (r === 8 && c === 13) || (r === 13 && c === 6);
                    if (isStartSquare) {
                       isSafe = true;
                       if (r === 6 && c === 1) { cellColor = "bg-rose-500"; specialColor = "text-rose-200"; }
                       if (r === 1 && c === 8) { cellColor = "bg-green-500"; specialColor = "text-green-200"; }
                       if (r === 8 && c === 13) { cellColor = "bg-yellow-500"; specialColor = "text-yellow-100"; }
                       if (r === 13 && c === 6) { cellColor = "bg-blue-500"; specialColor = "text-blue-200"; }
                    }

                    // Secondary Safe Squares
                    const isSecondarySafe = (r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8) || (r === 8 && c === 2);
                    if (isSecondarySafe) {
                      isSafe = true;
                      if (r === 2 && c === 6) { cellColor = "bg-green-50/80"; specialColor = "text-green-600"; }
                      if (r === 6 && c === 12) { cellColor = "bg-yellow-50/80"; specialColor = "text-yellow-600"; }
                      if (r === 12 && c === 8) { cellColor = "bg-blue-50/80"; specialColor = "text-blue-600"; }
                      if (r === 8 && c === 2) { cellColor = "bg-rose-50/80"; specialColor = "text-rose-500"; }
                    }

                    // Home Stretches
                    const isHomeStretch = (c === 7 && r > 0 && r < 7) || (r === 7 && c > 7 && c < 14) || (c === 7 && r > 7 && r < 14) || (r === 7 && c > 0 && c < 7);
                    if (c === 7 && r > 0 && r < 7) cellColor = "bg-green-500";
                    if (r === 7 && c > 7 && c < 14) cellColor = "bg-yellow-500";
                    if (c === 7 && r > 7 && r < 14) cellColor = "bg-blue-500";
                    if (r === 7 && c > 0 && c < 7) cellColor = "bg-rose-500";

                    // Finish Area background
                    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cellColor = "bg-white shadow-[inset_0_0_40px_rgba(0,0,0,0.08)]";

                    const isAnyHome = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);
                    const borderStyle = !isAnyHome ? "border-[0.5px] border-slate-300" : "";

                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "w-full h-full relative flex items-center justify-center transition-all duration-300 overflow-hidden", 
                          cellColor, 
                          borderStyle,
                          !isAnyHome && "shadow-[inset_0_0_15px_rgba(0,0,0,0.03)]",
                          isSafe && "ring-1 ring-inset ring-black/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.8)]"
                        )}
                      >
                         {/* Beveled Edge Highlight */}
                         {!isAnyHome && (
                            <div className="absolute top-0 left-0 right-0 h-[10%] bg-white/40 blur-[0.5px] pointer-events-none" />
                         )}

                         {/* Starting Stars with subtle pulse */}
                         {isStartSquare && (
                           <motion.div 
                             animate={{ 
                                scale: [1, 1.15, 1], 
                                opacity: [0.7, 1, 0.7],
                                filter: ["drop-shadow(0 0 0px #fff)", "drop-shadow(0 0 8px #fff)", "drop-shadow(0 0 0px #fff)"]
                             }}
                             transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                             className={cn("text-[14px] font-black absolute z-10", specialColor)}
                           >
                             <Shield className="w-5 h-5 fill-current" />
                           </motion.div>
                         )}

                         {/* Secondary Starting Stars */}
                         {isSecondarySafe && (
                            <div className={cn("opacity-60 absolute z-10", specialColor)}>
                              <Shield className="w-4 h-4 fill-current" />
                            </div>
                         )}

                         {/* Entrance Icons / Directional Cues */}
                         {isHomeStretch && (
                            <div className="opacity-[0.15] scale-75 pointer-events-none">
                               {c === 7 && r > 0 && r < 7 && <ChevronDown className="w-full h-full text-white" />}
                               {r === 7 && c > 7 && c < 14 && <ChevronLeft className="w-full h-full text-white" />}
                               {c === 7 && r > 7 && r < 14 && <ChevronUp className="w-full h-full text-white" />}
                               {r === 7 && c > 0 && c < 7 && <ChevronRight className="w-full h-full text-white" />}
                            </div>
                         )}

                         {/* Entrance Arrows (Outer Edge) */}
                         {r === 7 && c === 0 && <ChevronRight className="text-rose-500/50 w-4 h-4 absolute transform translate-x-2 animate-bounce-x" />}
                         {r === 0 && c === 7 && <ChevronDown className="text-green-500/50 w-4 h-4 absolute transform translate-y-2 animate-bounce-y" />}
                         {r === 7 && c === 14 && <ChevronLeft className="text-yellow-500/50 w-4 h-4 absolute transform -translate-x-2 animate-bounce-x" />}
                         {r === 14 && c === 7 && <ChevronUp className="text-blue-500/50 w-4 h-4 absolute transform -translate-y-2 animate-bounce-y" />}
                      </div>
                    );
                  })}

                  {renderPiecesOnBoard()}

                  {/* Home UI Layer */}
                  <div 
                    className="absolute inset-0 grid pointer-events-none"
                    style={{
                      gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                      gridTemplateRows: 'repeat(15, minmax(0, 1fr))'
                    }}
                  >
                      {[
                        { color: 'red', grid: 'col-start-1 col-end-7 row-start-1 row-end-7', bg: 'bg-rose-600' },
                        { color: 'green', grid: 'col-start-10 col-end-16 row-start-1 row-end-7', bg: 'bg-green-600' },
                        { color: 'blue', grid: 'col-start-1 col-end-7 row-start-10 row-end-16', bg: 'bg-blue-600' },
                        { color: 'yellow', grid: 'col-start-10 col-end-16 row-start-10 row-end-16', bg: 'bg-yellow-500' }
                      ].map(({ color, grid, bg }) => {
                         return (
                          <div key={color} className={cn("relative flex items-center justify-center p-2 sm:p-3", grid)}>
                             {/* The inner white card */}
                             <div className={cn(
                               "w-full h-full rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.15),inset_0_2px_10px_rgba(255,255,255,0.4)] relative pointer-events-auto overflow-hidden",
                               finishedOrder.includes(color as LudoColor) ? (
                                 finishedOrder.indexOf(color as LudoColor) === 0 ? "bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300" :
                                 finishedOrder.indexOf(color as LudoColor) === 1 ? "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-300" :
                                 "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300"
                               ) : status === 'finished' && players.some(p => p.color === color) ? "bg-gradient-to-br from-slate-50 to-rose-100" : "bg-white"
                             )}>
                                {/* Background Icon for Home Area */}
                                {!finishedOrder.includes(color as LudoColor) && !(status === 'finished' && players.some(p => p.color === color)) && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <Home className="w-24 h-24" />
                                  </div>
                                )}

                                {finishedOrder.includes(color as LudoColor) ? (
                                  <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                                  >
                                    {finishedOrder.indexOf(color as LudoColor) === 0 && (
                                      <>
                                        <motion.div
                                          animate={{ 
                                            y: [0, -8, 0],
                                            rotate: [0, 5, -5, 0]
                                          }}
                                          transition={{ 
                                            duration: 3, 
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                          }}
                                        >
                                          <Trophy className="w-14 h-14 text-yellow-500 mb-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]" />
                                        </motion.div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-yellow-700 bg-yellow-500/10 px-3 py-1 rounded-full">1° lugar</span>
                                      </>
                                    )}
                                    {finishedOrder.indexOf(color as LudoColor) === 1 && (
                                      <>
                                        <motion.div
                                          animate={{ 
                                            y: [0, -6, 0]
                                          }}
                                          transition={{ 
                                            duration: 2.5, 
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                          }}
                                        >
                                          <Medal className="w-14 h-14 text-slate-400 mb-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]" />
                                        </motion.div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-500/10 px-3 py-1 rounded-full">2° lugar</span>
                                      </>
                                    )}
                                    {finishedOrder.indexOf(color as LudoColor) === 2 && (
                                      <>
                                        <motion.div
                                          animate={{ 
                                            scale: [1, 1.05, 1]
                                          }}
                                          transition={{ 
                                            duration: 2, 
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                          }}
                                        >
                                          <Medal className="w-14 h-14 text-amber-600 mb-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]" />
                                        </motion.div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-600/10 px-3 py-1 rounded-full">3° lugar</span>
                                      </>
                                    )}
                                  </motion.div>
                                ) : status === 'finished' && players.some(p => p.color === color) ? (
                                  <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                                  >
                                    <motion.span 
                                      animate={{ 
                                        y: [0, 4, 0],
                                        scale: [1, 1.1, 1]
                                      }}
                                      transition={{ duration: 4, repeat: Infinity }}
                                      className="text-5xl mb-2"
                                    >
                                      😢
                                    </motion.span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 bg-rose-500/10 px-3 py-1 rounded-full">Perdedor</span>
                                  </motion.div>
                                ) : (
                                  <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-2 gap-2">
                                    {[0, 1, 2, 3].map(index => {
                                      const piece = board.find(p => p.id === `${color}-${index}`);
                                      const isHome = piece?.position === 'home';
                                      return (
                                        <div key={index} className="aspect-square flex items-center justify-center rounded-full bg-slate-50 shadow-inner p-1">
                                          {isHome && piece && (
                                            <Piece 
                                              id={piece.id}
                                              color={piece.color}
                                              turn={turn}
                                              diceValue={diceValue}
                                              canMove={!players.find(pl => pl.color === color)?.isLeft && status === 'playing' && (diceValue === 6 || diceValue === 1)}
                                              onClick={() => handlePieceClick(piece)}
                                              size="w-full h-full"
                                              isLeft={players.find(pl => pl.color === color)?.isLeft}
                                              players={players}
                                              isFinished={false}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                             </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Central Finish Area (Polished 3D Relief) */}
                  <div 
                    className="absolute z-30 pointer-events-auto bg-slate-900/40 backdrop-blur-md border border-white/10 flex items-center justify-center overflow-visible"
                    style={{
                      top: '40%',
                      left: '40%',
                      width: '20%',
                      height: '20%'
                    }}
                  >
                     {/* Celebratory Sparkles in Center */}
                     <div className="absolute inset-0 pointer-events-none overflow-visible">
                        {[1, 2, 3].map((i) => (
                           <motion.div
                             key={i}
                             className="absolute"
                             style={{ left: '50%', top: '50%' }}
                             animate={{
                                scale: [0, 1.2, 0],
                                rotate: [0, 180, 360],
                                opacity: [0, 0.6, 0]
                             }}
                             transition={{
                                duration: 3 + i,
                                repeat: Infinity,
                                delay: i * 0.5
                             }}
                           >
                              <Sparkles className="w-8 h-8 text-yellow-400 -translate-x-1/2 -translate-y-1/2" />
                           </motion.div>
                        ))}
                     </div>

                     <svg viewBox="0 0 100 100" className="w-full h-full block overflow-visible z-10">
                        <defs>
                          <linearGradient id="grad-green" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#166534" />
                          </linearGradient>
                          <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#991b1b" />
                          </linearGradient>
                          <linearGradient id="grad-yellow" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#854d0e" />
                          </linearGradient>
                          <linearGradient id="grad-blue" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e40af" />
                          </linearGradient>
                        </defs>
                        
                        {/* Triangles with deep gradients and spacing for relief */}
                        <polygon points="0,0 100,0 50,48" fill="url(#grad-green)" fillOpacity="0.8" />
                        <polygon points="0,0 0,100 48,50" fill="url(#grad-red)" fillOpacity="0.8" />
                        <polygon points="100,0 100,100 52,50" fill="url(#grad-yellow)" fillOpacity="0.8" />
                        <polygon points="0,100 100,100 50,52" fill="url(#grad-blue)" fillOpacity="0.8" />

                        {/* Central Relief Diamond */}
                        <rect x="42.5" y="42.5" width="15" height="15" fill="#1e293b" fillOpacity="0.6" transform="rotate(45 50 50)" />
                        <rect x="45" y="45" width="10" height="10" fill="white" transform="rotate(45 50 50)" fillOpacity="0.1" />
                        <circle cx="50" cy="50" r="2" fill="white" fillOpacity="0.5" />
                     </svg>
                  </div>
                </div>
              </div>

              {/* Lobby Controls (Below Board) */}
              {online && status === 'waiting' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col items-center gap-6 pt-4"
                >
                  <div className="w-full flex flex-col items-center gap-4">
                    {isCreator ? (
                      <button
                        onClick={startGame}
                        disabled={players.length < 2}
                        className={cn(
                          "px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-2xl relative group overflow-hidden",
                          players.length < 2 
                            ? "bg-white/5 text-white/10 cursor-not-allowed border border-white/5" 
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:scale-105 active:scale-95 hover:shadow-blue-500/50 border border-white/20"
                        )}
                      >
                        {/* Inner Glow Effect */}
                        {players.length >= 2 && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        )}
                        <Play className={cn("w-5 h-5", players.length < 2 ? "text-white/10" : "text-white drop-shadow-sm")} />
                        <span className="drop-shadow-md">INICIAR PARTIDA</span>
                      </button>
                    ) : (
                      <div className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
                        <Users className="w-4 h-4 animate-pulse text-blue-400" />
                        Aguardando o Criador iniciar...
                      </div>
                    )}

                    {players.length < 4 && (
                      <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-green-400/80">Novos jogadores ainda podem entrar na sala</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
           </div>
        </div>

          {/* Right: Players Status (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-3 space-y-6 lg:order-3 order-1 flex-col">
             {renderPlayersStatus(false)}
          </div>
      </div>
    </div>

      <AnimatePresence>
        {online && roomId && showChat && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-slate-950 border-l border-white/10 z-[150] shadow-2xl">
            <Chat 
              socket={socket} 
              activeRoom={{ id: roomId, name: 'Ludo Chat', isPrivate: false }} 
              onBack={() => setShowChat(false)} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
           >
             <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] p-10 max-w-lg w-full"
             >
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Ludo Rules</h2>
                 <button onClick={() => setShowRules(false)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-6 opacity-70 text-sm leading-relaxed">
                 <p>1. Roll a <b>6</b> or a <b>1</b> to move a piece from home to the starting square.</p>
                 <p>2. Move pieces clockwise around the board based on your roll.</p>
                 <p>3. Land on an opponent's piece to send it back home!</p>
                 <p>4. Reach the finish area with all 4 pieces to win.</p>
                 <p>5. Rolling a <b>6</b> (or a <b>1</b> to exit home) gives you an extra turn.</p>
               </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl"
            >
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Exit Game?</h2>
              <p className="text-sm opacity-60 mb-12">Are you sure you want to leave the match?</p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={confirmExit}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg"
                >
                  Yes, Leave Game
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                >
                  Stay and Win
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
