import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Grid3X3, Bell, HelpCircle, Info, LogOut, Lock, Eye, Volume2, VolumeX } from 'lucide-react';
import { RematchButton } from './ui/RematchButton';
import { handleOnlineRematchRequest } from '../lib/rematchUtils';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { useSoundEffects } from '../lib/useSoundEffects';
import { db, doc, getDoc, addDoc, collection, serverTimestamp, OperationType, handleFirestoreError, onSnapshot, query, where, updateDoc, increment, arrayRemove, deleteDoc, arrayUnion } from '../firebase';
import { cn } from '../lib/utils';
import { Socket } from 'socket.io-client';
import { Chat } from './Chat';
import { createTicTacToeInitialBoard } from '../lib/gameUtils';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const TicTacToe = ({ vsCPU, difficulty = 'Easy', online, socket, roomId, friendId, hasIncomingRematch, isSpectator, onBack }: { vsCPU?: boolean, difficulty?: Difficulty, online?: boolean, socket?: Socket | null, roomId?: string, friendId?: string, hasIncomingRematch?: boolean, isSpectator?: boolean, onBack: () => void }) => {
  const { user, profile } = useAuth();
  const [profileProxy, setProfileProxy] = useState<any>(isSpectator ? null : profile);
  const { showError } = useError();
  const [board, setBoard] = useState<(string | null)[]>(() => {
    if (!online) {
      const savedWinner = localStorage.getItem('tictactoe_offline_winner');
      if (savedWinner) {
        // If the last preserved game was finished, clear it and start fresh
        localStorage.removeItem('tictactoe_offline_board');
        localStorage.removeItem('tictactoe_offline_next');
        localStorage.removeItem('tictactoe_offline_winner');
        return createTicTacToeInitialBoard();
      }
      const saved = localStorage.getItem('tictactoe_offline_board');
      return saved ? JSON.parse(saved) : createTicTacToeInitialBoard();
    }
    return createTicTacToeInitialBoard();
  });
  const [isXNext, setIsXNext] = useState(() => {
    if (!online) {
      const saved = localStorage.getItem('tictactoe_offline_next');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [winner, setWinner] = useState<string | null>(() => {
    if (!online) {
      return localStorage.getItem('tictactoe_offline_winner');
    }
    return null;
  });

  // Persist offline state
  useEffect(() => {
    if (!online) {
      localStorage.setItem('tictactoe_offline_board', JSON.stringify(board));
      localStorage.setItem('tictactoe_offline_next', JSON.stringify(isXNext));
      if (winner) localStorage.setItem('tictactoe_offline_winner', winner);
      else localStorage.removeItem('tictactoe_offline_winner');
    }
  }, [online, board, isXNext, winner]);
  const [playerSymbol, setPlayerSymbol] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isForfeit, setIsForfeit] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const isInitialChatMount = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingTimeout = useRef(false);
  const gameStarted = useRef(false);

  // Sound Management
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('game_muted') === 'true');
  const { playSound } = useSoundEffects(isMuted);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('game_muted', String(newMuted));
  };

  useEffect(() => {
    if (winner) {
      if (winner === 'Draw') playSound('draw');
      else playSound('win');
    }
  }, [winner]);

  // Refs to keep track of latest state for the timer closure
  const stateRef = useRef({
    board,
    isXNext,
    winner,
    playerSymbol,
    online,
    vsCPU,
    opponent
  });

  useEffect(() => {
    stateRef.current = {
      board,
      isXNext,
      winner,
      playerSymbol,
      online,
      vsCPU,
      opponent
    };
  }, [board, isXNext, winner, playerSymbol, online, vsCPU, opponent]);

  const TURN_TIME = 15;
  const mySymbol = online ? playerSymbol : 'X';
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const isMeActive = (isXNext && mySymbol === 'X') || (!isXNext && mySymbol === 'O');
  const isOpponentActive = (isXNext && opponentSymbol === 'X') || (!isXNext && opponentSymbol === 'O');

  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  useEffect(() => {
    if (!online) {
      setPlayerSymbol('X');
    }
  }, [online]);

  useEffect(() => {
    if (online && user) {
      if (friendId) {
        const fetchOpponent = async () => {
          try {
            const docRef = doc(db, 'users', friendId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setOpponent({ uid: docSnap.id, ...docSnap.data() });
            }
          } catch (error) {
            console.error("Error fetching opponent profile:", error);
          }
        };
        fetchOpponent();
      }

      if (roomId) {
        // Unified room monitoring for both open and private matches
        const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
          if (docSnap.exists()) {
            const roomData = docSnap.data();
            setParticipantCount(roomData.participants?.length || 0);

            if (roomData.type === 'private' && roomData.accessCode) {
              setAccessCode(roomData.accessCode);
            }

            // Safety: Ensure I am in the participants list if the game is active
            if (!isSpectator && roomData.status === 'playing' && user?.uid && !roomData.participants.includes(user.uid)) {
              updateDoc(doc(db, 'rooms', roomId), {
                participants: arrayUnion(user.uid)
              });
            }

            // Set player symbol based on creatorId
            const mySymbol = isSpectator ? 'X' : (user?.uid === roomData.creatorId ? 'X' : 'O');
            if (stateRef.current.playerSymbol !== mySymbol) {
              setPlayerSymbol(mySymbol);
            }

            // Sync Game State from Firestore
            if (roomData.gameState && roomData.gameState.board) {
              setBoard(roomData.gameState.board);
              setIsXNext(roomData.gameState.turn === 'X');
              
              // Only sync winner from Firestore if it's not null, or if we are in finished status
              if (roomData.gameState.winner !== undefined) {
                if (roomData.gameState.winner || roomData.status === 'finished') {
                  setWinner(roomData.gameState.winner);
                } else if (roomData.status === 'playing') {
                  setWinner(null);
                  setIsForfeit(false);
                }
              }
            }

            if (roomData.participants.length >= 2) {
              const p1Id = roomData.participants[0];
              const p2Id = roomData.participants[1];
              const oppId = isSpectator ? p2Id : (p1Id === user?.uid ? p2Id : p1Id);
              
              if (isSpectator) {
                // Spectator needs to see both players
                if (!profileProxy || profileProxy.uid !== p1Id) {
                  getDoc(doc(db, 'users', p1Id)).then(snap => {
                    if (snap.exists()) setProfileProxy({ uid: snap.id, ...snap.data() });
                  });
                }
              }
              
              // Aggressively clear game-over states when we have both players in a playing room
              if (roomData.status === 'playing') {
                setWinner(null);
                setWinningLine(null);
                setIsForfeit(false);
                gameStarted.current = true;
              }

              if (oppId && (!stateRef.current.opponent || stateRef.current.opponent.uid !== oppId)) {
                // Set a placeholder opponent immediately
                if (!stateRef.current.opponent) {
                  setOpponent({ uid: oppId, displayName: 'Opponent...' });
                }
                getDoc(doc(db, 'users', oppId)).then(snap => {
                  if (snap.exists()) setOpponent({ uid: snap.id, ...snap.data() });
                });
              }
            } else if (roomData.participants.length < 2) {
              const isStillInRoom = roomData.participants.includes(user?.uid);
              // Only trigger forfeit if the game was active and we haven't already set a winner
              if (isStillInRoom && roomData.status === 'playing' && gameStarted.current && !stateRef.current.winner) {
                setOpponent(null);
                setIsForfeit(true);
                setWinner(mySymbol);
              }
            }
          }
        });
        return () => unsubscribe();
      }
    }
  }, [online, friendId, roomId, user]);

  useEffect(() => {
    if (online && socket && roomId) {
      socket.emit('join_room', roomId);
      
      socket.on('receive_move', (move: any) => {
        setBoard(prev => {
          const next = [...prev];
          next[move.index] = move.symbol;
          return next;
        });
        setIsXNext(move.symbol === 'O');
      });

      socket.on('opponent_forfeited', () => {
        setIsForfeit(true);
        setWinner(playerSymbol);
      });

      return () => {
        socket.off('receive_move');
        socket.off('opponent_forfeited');
      };
    }
  }, [online, socket, roomId, user, playerSymbol]);

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
          const latestMsg = newMessages[newMessages.length - 1].doc.data();
          setUnreadCount(prev => prev + newMessages.length);
          setLastMessage(latestMsg.text);
          
          // Play notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Audio play failed:', e));

          // Clear toast after 4 seconds
          const timer = setTimeout(() => setLastMessage(null), 4000);
          return () => clearTimeout(timer);
        }
      });
      return () => unsubscribe();
    } else if (showChat) {
      setUnreadCount(0);
      isInitialChatMount.current = true;
    }
  }, [online, roomId, showChat, user]);

  useEffect(() => {
    if (winner || (online && !opponent)) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(TURN_TIME);
    isHandlingTimeout.current = false;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isXNext, winner, !!opponent, playerSymbol]);

  const handleTimeout = () => {
    if (isHandlingTimeout.current) return;
    
    const { isXNext: currentIsXNext, playerSymbol: currentSymbol, online: isOnline, board: currentBoard, vsCPU: isVsCPU } = stateRef.current;
    const turnSymbol = currentIsXNext ? 'X' : 'O';
    
    // In online mode, only the player whose turn it is should trigger the timeout move
    if (isOnline) {
      if (isSpectator || turnSymbol !== currentSymbol) return;
    } else if (isVsCPU && !currentIsXNext) {
      return;
    }

    isHandlingTimeout.current = true;

    const emptySquares = currentBoard.map((s, i) => s === null ? i : null).filter((s): s is number => s !== null);
    if (emptySquares.length > 0) {
      const randomMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
      handleClick(randomMove, true);
    }
  };

  const checkWinner = (squares: (string | null)[]) => {
    for (let i = 0; i < winningLines.length; i++) {
      const [a, b, c] = winningLines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every(s => s) ? 'Draw' : null;
  };

  const getWinningLine = (squares: (string | null)[]) => {
    for (let i = 0; i < winningLines.length; i++) {
      const [a, b, c] = winningLines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return [a, b, c];
      }
    }
    return null;
  };

  const getCPUMove = (currentBoard: (string | null)[], level: Difficulty): number => {
    const emptySquares = currentBoard.map((s, i) => s === null ? i : null).filter((s): s is number => s !== null);
    
    if (level === 'Easy') {
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    if (level === 'Medium') {
      // 1. Try to win
      for (const move of emptySquares) {
        const tempBoard = [...currentBoard];
        tempBoard[move] = 'O';
        if (checkWinner(tempBoard) === 'O') return move;
      }
      // 2. Block player
      for (const move of emptySquares) {
        const tempBoard = [...currentBoard];
        tempBoard[move] = 'X';
        if (checkWinner(tempBoard) === 'X') return move;
      }
      // 3. Random
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    // Hard: Minimax
    const minimax = (board: (string | null)[], depth: number, isMaximizing: boolean): number => {
      const result = checkWinner(board);
      if (result === 'O') return 10 - depth;
      if (result === 'X') return depth - 10;
      if (result === 'Draw') return 0;

      if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (board[i] === null) {
            board[i] = 'O';
            const score = minimax(board, depth + 1, false);
            board[i] = null;
            bestScore = Math.max(score, bestScore);
          }
        }
        return bestScore;
      } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
          if (board[i] === null) {
            board[i] = 'X';
            const score = minimax(board, depth + 1, true);
            board[i] = null;
            bestScore = Math.min(score, bestScore);
          }
        }
        return bestScore;
      }
    };

    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  useEffect(() => {
    if (vsCPU && !isXNext && !winner) {
      const timer = setTimeout(() => {
        const move = getCPUMove(board, difficulty);
        if (move !== -1) handleClick(move, true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isXNext, vsCPU, winner, board, difficulty]);

  useEffect(() => {
    if (winner) return;
    const w = checkWinner(board);
    if (w) {
      setWinner(w);
      setWinningLine(getWinningLine(board));
    }
  }, [board]);

  useEffect(() => {
    if (winner) {
      saveMatch(winner, isForfeit);
    }
  }, [winner, isForfeit]);

  const saveMatch = async (result: string, isForfeit = false) => {
    if (!user) return;
    
    // --- Score Update (Every player updates their own score) ---
    if (isSpectator) return;
    try {
      let points = 0;
      if (result === 'Draw') {
        points = 2;
      } else if (result === playerSymbol || (!online && result === 'X')) {
        points = 10;
      }
      
      if (points > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          score: increment(points),
          [`stats.ticTacToe.wins`]: result === playerSymbol || (!online && result === 'X') ? increment(1) : increment(0),
          [`stats.ticTacToe.losses`]: (result !== 'Draw' && result !== playerSymbol && (online || result !== 'X')) ? increment(1) : increment(0),
        });
      } else if (result !== 'Draw') {
        // Even if no points (defeat), update losses
        await updateDoc(doc(db, 'users', user.uid), {
          [`stats.ticTacToe.losses`]: increment(1)
        });
      }
    } catch (error) {
      console.error("Error updating score:", error);
    }

    // --- Match Record (Only one player saves to avoid duplicates) ---
    // In online mode:
    // 1. If it's a normal end, only 'X' saves.
    // 2. If it's a forfeit, the winner (the one who stayed) saves.
    if (online) {
      if (isForfeit) {
        if (result !== playerSymbol) return; 
      } else {
        if (playerSymbol !== 'X') return;
      }
    }

    try {
      let playersArray: string[] = [];
      if (online) {
        if (roomId?.startsWith('room_')) {
          playersArray = [user.uid];
          if (opponent?.uid) playersArray.push(opponent.uid);
        } else {
          playersArray = roomId?.replace('game_', '').split('_') || [];
        }
      } else {
        playersArray = [user.uid, 'CPU'];
      }

      await addDoc(collection(db, 'matches'), {
        players: playersArray,
        vsCPU: !!vsCPU,
        gameType: 'Tic-Tac-Toe',
        difficulty: vsCPU ? difficulty : null,
        winner: result === 'Draw' ? 'Draw' : (
          online 
            ? (result === playerSymbol ? user.uid : (opponent?.uid || 'Opponent'))
            : (result === 'X' ? 'Player' : 'CPU')
        ),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches', showError);
    }
  };

  const handleClick = (i: number, isCPUMove = false) => {
    if (isSpectator) return;
    const { board: currentBoard, isXNext: currentIsXNext, winner: currentWinner, playerSymbol: currentSymbol, online: isOnline } = stateRef.current;
    if (currentWinner || currentBoard[i]) return;
    
    const turnSymbol = currentIsXNext ? 'X' : 'O';

    if (isOnline) {
      if (!opponent) return; // Prevent move if opponent hasn't joined
      if (turnSymbol !== currentSymbol) return;
      
      socket?.emit('make_move', { roomId, move: { index: i, symbol: currentSymbol } });
    } else if (vsCPU) {
      // If it's a manual click (isCPUMove = false), only allow if it's the player's turn
      if (!isCPUMove && turnSymbol !== currentSymbol) return;
    }

    const newBoard = [...currentBoard];
    newBoard[i] = turnSymbol;
    setBoard(newBoard);
    playSound('move');
    // Explicitly set next turn based on current move symbol to ensure idempotency
    setIsXNext(turnSymbol === 'X' ? false : true);

    if (isOnline && roomId) {
      const nextSymbol = turnSymbol === 'X' ? 'O' : 'X';
      const win = checkWinner(newBoard);
      updateDoc(doc(db, 'rooms', roomId), {
        gameState: {
          board: newBoard,
          turn: nextSymbol,
          winner: win ? turnSymbol : (newBoard.every(s => s) ? 'Draw' : null)
        }
      });
    }
  };

  const handleForfeit = async () => {
    if (isSpectator) {
      onBack();
      return;
    }
    if (online && socket && roomId) {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);

      if (!winner) {
        socket.emit('forfeit', { roomId, userId: user?.uid });
        const oppSymbol = playerSymbol === 'X' ? 'O' : 'X';
        updateDoc(roomRef, {
          'gameState.winner': oppSymbol,
          status: 'finished'
        });
      }
      
      // Room cleanup logic
      if (roomId) {
        try {
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            const newParticipants = (roomData.participants || []).filter((id: string) => id !== user?.uid);
            
            if (newParticipants.length === 0) {
              await deleteDoc(roomRef);
            } else {
              await updateDoc(roomRef, {
                participants: arrayRemove(user?.uid),
                participantCount: increment(-1)
              });
            }
          }
        } catch (error) {
          console.error("Error cleaning up room:", error);
        }
      }
    }
    localStorage.removeItem('tictactoe_offline_board');
    localStorage.removeItem('tictactoe_offline_next');
    localStorage.removeItem('tictactoe_offline_winner');
    onBack();
  };

  useEffect(() => {
    if (!online || !socket) return;

    socket.on('receive_rematch', (data) => {
      // Handled by GameLand notifications
    });

    socket.on('rematch_reset', () => {
      setRematchRequested(false);
      setWinner(null);
      setWinningLine(null);
      setIsForfeit(false);
      setBoard(createTicTacToeInitialBoard());
      setIsXNext(true);
      setTimeLeft(TURN_TIME);
      gameStarted.current = false;
    });

    return () => {
      socket.off('receive_rematch');
      socket.off('rematch_reset');
    };
  }, [online, socket]);

  const handlePlayerLeave = async () => {
    if (!online || !roomId || !user) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const newParticipants = (roomData.participants || []).filter((id: string) => id !== user.uid);
        
        if (newParticipants.length === 0) {
          await deleteDoc(roomRef);
        } else {
          await updateDoc(roomRef, {
            participants: arrayRemove(user.uid),
            participantCount: increment(-1)
          });
        }
      }
    } catch (error) {
      console.error("Error on tab closure cleanup:", error);
    }
  };

  useEffect(() => {
    if (!online || !roomId) return;

    const handleUnload = () => {
      if (!winner) {
        // Just leave without forfeiting the game status, allowing for resume
        handlePlayerLeave();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [online, roomId, winner]);

  const handleExitClick = () => {
    if ((online || vsCPU) && !winner) {
      setShowExitConfirm(true);
    } else if (online && roomId && user) {
      handleForfeit();
    } else {
      onBack();
    }
  };

  const handleRematch = () => {
    if (isSpectator) return;
    if (vsCPU) {
      setBoard(createTicTacToeInitialBoard());
      setIsXNext(true);
      setWinner(null);
      setWinningLine(null);
      setIsForfeit(false);
      setTimeLeft(TURN_TIME);
      gameStarted.current = false;
    } else if (online && roomId && opponent) {
      setRematchRequested(true);
      handleOnlineRematchRequest(socket, roomId, opponent.uid, profile, 'Tic-Tac-Toe');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* New Message Toast */}
      <AnimatePresence>
        {lastMessage && !showChat && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/50 backdrop-blur-md cursor-pointer"
            onClick={() => setShowChat(true)}
          >
            <div className="p-1.5 bg-white/20 rounded-lg">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">New Message</span>
              <p className="text-sm font-bold truncate max-w-[200px]">{lastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
          <button 
            onClick={handleExitClick}
            className="flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase"
          >
            <X className="w-5 h-5" />
            <span className="hidden min-[450px]:inline">EXIT GAME</span>
            <span className="min-[450px]:hidden">EXIT</span>
          </button>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={toggleMute}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white/40" /> : <Volume2 className="w-5 h-5 text-white/80" />}
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
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 sm:pt-32 pb-12 flex flex-col lg:flex-row gap-12 items-start justify-center">
        <div className={cn(
          "flex-1 flex flex-col items-center gap-8 w-full transition-all duration-500",
          showChat ? "lg:pr-4" : ""
        )}>
          <div className="text-center">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-2 bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
              Tic-Tac-Toe
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase opacity-60">
              {online ? (
                <>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Online Match • {playerSymbol}
                </>
              ) : vsCPU ? (
                <>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  vs CPU • {difficulty}
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  Local Multiplayer
                </>
              )}
            </div>
                     <div className="mt-8 sm:mt-12 flex items-center justify-center gap-4 sm:gap-12">
              <div className={cn(
                "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-[32px] transition-all duration-500 border relative",
                isMeActive ? (mySymbol === 'X' ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] scale-105 sm:scale-110" : "bg-rose-500/10 border-rose-500/50 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)] scale-105 sm:scale-110") : "opacity-30 border-transparent"
              )}>
                {isMeActive && !winner && (!online || opponent) && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="48%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (timeLeft / TURN_TIME) * 100}
                      className={mySymbol === 'X' ? "text-blue-500 transition-all duration-1000 ease-linear" : "text-rose-500 transition-all duration-1000 ease-linear"}
                    />
                  </svg>
                )}
                <div className="relative">
                  <img 
                    src={profileProxy?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileProxy?.uid || 'p1'}`} 
                    className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 shadow-2xl", mySymbol === 'X' ? "border-blue-500" : "border-rose-500")}
                    alt="Player 1"
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn("absolute -bottom-2 -right-2 text-white text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shadow-lg", mySymbol === 'X' ? "bg-blue-500" : "bg-rose-500")}>{mySymbol}</div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[100px]">{profileProxy?.displayName || (isSpectator ? 'Player 1' : 'Me')}</span>
                {isMeActive && !winner && (!online || opponent) && <span className={cn("text-[10px] font-mono font-bold", mySymbol === 'X' ? "text-blue-400" : "text-rose-400")}>{timeLeft}s</span>}
              </div>

              <div className="text-xl sm:text-3xl font-black opacity-10 italic tracking-tighter">VS</div>

              <div className={cn(
                "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-[32px] transition-all duration-500 border relative",
                isOpponentActive ? (opponentSymbol === 'X' ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] scale-105 sm:scale-110" : "bg-rose-500/10 border-rose-500/50 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)] scale-105 sm:scale-110") : "opacity-30 border-transparent"
              )}>
                {isOpponentActive && !winner && (!online || opponent) && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="48%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (timeLeft / TURN_TIME) * 100}
                      className={opponentSymbol === 'X' ? "text-blue-500 transition-all duration-1000 ease-linear" : "text-rose-500 transition-all duration-1000 ease-linear"}
                    />
                  </svg>
                )}
                <div className="relative">
                  {vsCPU ? (
                    <div className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 flex items-center justify-center border-2 shadow-2xl", opponentSymbol === 'X' ? "border-blue-500" : "border-rose-500")}>
                      <Grid3X3 className={cn("w-6 h-6 sm:w-8 sm:h-8", opponentSymbol === 'X' ? "text-blue-500" : "text-rose-500")} />
                    </div>
                  ) : (
                    <img 
                      src={opponent?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.uid || friendId || 'p2'}`} 
                      className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 shadow-2xl", opponentSymbol === 'X' ? "border-blue-500" : "border-rose-500")}
                      alt="Opponent"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className={cn("absolute -bottom-2 -right-2 text-white text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shadow-lg", opponentSymbol === 'X' ? "bg-blue-500" : "bg-rose-500")}>{opponentSymbol}</div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[100px]">{vsCPU ? 'CPU' : (opponent?.displayName || 'Opponent')}</span>
                {isOpponentActive && !winner && (!online || opponent) && <span className={cn("text-[10px] font-mono font-bold", opponentSymbol === 'X' ? "text-blue-400" : "text-rose-400")}>{timeLeft}s</span>}
              </div>
            </div>

            {online && !winner && (
              <div className="mt-8 h-6">
                <p className={cn(
                  "font-black text-xs uppercase tracking-[0.2em] transition-all duration-300",
                  (!opponent) ? "text-yellow-400 animate-pulse" : ((isXNext ? 'X' : 'O') === playerSymbol ? "text-green-400" : "text-white/20")
                )}>
                  {!opponent ? "Waiting for opponent..." : ((isXNext ? 'X' : 'O') === playerSymbol ? "Your Turn" : "Opponent's Turn")}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 p-6 bg-white/5 rounded-[40px] border border-white/10 shadow-2xl backdrop-blur-sm">
            {board?.map((square, i) => {
              const isWinningSquare = winningLine?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={online && ((isXNext ? 'X' : 'O') !== playerSymbol || !opponent)}
                  className={cn(
                    "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/5 border border-white/10 text-5xl font-black flex items-center justify-center transition-all duration-300 group relative overflow-hidden",
                    !square && !winner && "hover:bg-white/10 hover:scale-105 active:scale-95",
                    square === 'X' ? "text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" : 
                    square === 'O' ? "text-rose-400 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]" : "",
                    isWinningSquare && (square === 'X' ? "bg-blue-500/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]" : "bg-rose-500/20 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)]"),
                    isWinningSquare && "z-20 scale-105"
                  )}
                >
                  {square && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="relative z-10"
                    >
                      {square}
                    </motion.span>
                  )}
                  {!square && !winner && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {winner && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-8"
              >
                <div className="mb-8">
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
                    {winner === 'Draw' ? "It's a Draw!" : (
                      winner === mySymbol ? "Victory!" : "Defeat!"
                    )}
                  </h3>
                  <p className="text-sm opacity-40 uppercase tracking-widest">
                    {winner === 'Draw' ? "Well played by both" : (
                      winner === mySymbol ? "You dominated the board" : "Better luck next time"
                    )}
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  {(vsCPU || online) && (
                    <div className="flex flex-col items-center gap-2">
                      {(vsCPU || (online && participantCount >= 2)) && !isSpectator && (
                        <RematchButton 
                          onClick={handleRematch} 
                          size="lg" 
                          isLoading={rematchRequested}
                          loadingLabel={hasIncomingRematch ? "Accepting..." : "Requested..."}
                          disabled={online && hasIncomingRematch}
                          label={hasIncomingRematch ? "Rematch Invited" : "Rematch"}
                        />
                      )}
                      {online && participantCount < 2 && (
                        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest animate-pulse">
                          Opponent left the room
                        </span>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={handleExitClick}
                    className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                  >
                    {online ? 'Dashboard' : 'Exit'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {online && roomId && showChat && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed inset-y-0 right-0 z-[60] w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-xs tracking-widest">Game Chat</h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-tighter">Live with opponent</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 opacity-40 hover:opacity-100" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <Chat 
                  socket={socket} 
                  activeRoom={{ id: roomId, name: 'Game Chat', isPrivate: false, friendId }} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
                <X className="w-5 h-5 opacity-40" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-yellow-500/10 rounded-2xl">
                  <Info className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">How to Play</h3>
                  <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">Tic-Tac-Toe Rules</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                  <div>
                    <h4 className="font-bold mb-1">The Objective</h4>
                    <p className="text-sm opacity-60">Be the first player to get three of your marks (X or O) in a row—horizontally, vertically, or diagonally.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-rose-400">2</div>
                  <div>
                    <h4 className="font-bold mb-1">Taking Turns</h4>
                    <p className="text-sm opacity-60">Players take turns placing their mark in an empty square. In this version, you have 15 seconds per turn!</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-purple-400">3</div>
                  <div>
                    <h4 className="font-bold mb-1">Winning & Draws</h4>
                    <p className="text-sm opacity-60">If all 9 squares are filled and no one has three in a row, the game is a draw.</p>
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
      </AnimatePresence>
      {/* Exit Confirmation Modal */}
      <AnimatePresence>
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
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">{isSpectator ? 'Stop Spectating?' : 'Exit Game?'}</h2>
              <p className="text-sm opacity-60 mb-12 leading-relaxed">
                {isSpectator 
                  ? 'Are you sure you want to stop watching this match?' 
                  : 'If you leave now, the victory will be awarded to your opponent. Are you sure you want to quit?'}
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleForfeit}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95",
                    isSpectator ? "bg-white/10 hover:bg-white/20" : "bg-rose-600 hover:bg-rose-500"
                  )}
                >
                  {isSpectator ? 'Leave View' : 'Yes, Exit Game'}
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                >
                  {isSpectator ? 'Back' : 'No, Stay and Play'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
