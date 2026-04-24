import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Info, HelpCircle, Trophy, RotateCcw, LogOut, Lock, Grid3X3, Eye, Volume2, VolumeX } from 'lucide-react';
import { RematchButton } from './ui/RematchButton';
import { handleOnlineRematchRequest } from '../lib/rematchUtils';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { useSoundEffects } from '../lib/useSoundEffects';
import { db, doc, getDoc, addDoc, collection, serverTimestamp, OperationType, handleFirestoreError, onSnapshot, query, where, updateDoc, increment, arrayRemove, deleteDoc, arrayUnion } from '../firebase';
import { cn } from '../lib/utils';
import { Socket } from 'socket.io-client';
import { Chat } from './Chat';
import { createCheckersInitialBoard, CheckersPiece } from '../lib/gameUtils';

type Square = CheckersPiece | null;

export const Checkers = ({ online, socket, roomId, friendId, vsCPU, difficulty = 'Medium', hasIncomingRematch, isSpectator, onBack }: { online?: boolean, socket?: Socket | null, roomId?: string, friendId?: string, vsCPU?: boolean, difficulty?: string, hasIncomingRematch?: boolean, isSpectator?: boolean, onBack: () => void }) => {
  const { user, profile } = useAuth();
  const [profileProxy, setProfileProxy] = useState<any>(isSpectator ? null : profile);
  const { showError } = useError();
  
  const [winner, setWinner] = useState<'red' | 'black' | 'Draw' | null>(() => {
    if (!online) {
      return (localStorage.getItem('checkers_offline_winner') as any) || null;
    }
    return null;
  });

  useEffect(() => {
    if (winner) {
      if (winner === 'Draw') playSound('draw');
      else playSound('win');
    }
  }, [winner]);

  // Initial board setup
  const [board, setBoard] = useState<Square[][]>(() => {
    if (!online) {
      const savedWinner = localStorage.getItem('checkers_offline_winner');
      if (savedWinner) {
        // If the last preserved game was finished, clear it and start fresh
        localStorage.removeItem('checkers_offline_board');
        localStorage.removeItem('checkers_offline_turn');
        localStorage.removeItem('checkers_offline_winner');
        return createCheckersInitialBoard();
      }
      const saved = localStorage.getItem('checkers_offline_board');
      return saved ? JSON.parse(saved) : createCheckersInitialBoard();
    }
    return createCheckersInitialBoard();
  });
  const [turn, setTurn] = useState<'red' | 'black'>(() => {
    if (!online) {
      return (localStorage.getItem('checkers_offline_turn') as any) || 'red';
    }
    return 'red';
  });
  const [selectedPiece, setSelectedPiece] = useState<{r: number, c: number} | null>(null);
  const [validMoves, setValidMoves] = useState<{r: number, c: number, capture?: {r: number, c: number}}[]>([]);

  // Persist offline state
  useEffect(() => {
    if (!online) {
      localStorage.setItem('checkers_offline_board', JSON.stringify(board));
      localStorage.setItem('checkers_offline_turn', turn);
      if (winner) localStorage.setItem('checkers_offline_winner', winner);
      else localStorage.removeItem('checkers_offline_winner');
    }
  }, [online, board, turn, winner]);
  const [playerColor, setPlayerColor] = useState<'red' | 'black' | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isForfeit, setIsForfeit] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
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

  // Refs to keep track of latest state for the timer closure
  const stateRef = useRef({
    board,
    turn,
    winner,
    playerColor,
    online,
    opponent,
    difficulty,
    vsCPU,
    roomId
  });

  useEffect(() => {
    stateRef.current = {
      board,
      turn,
      winner,
      playerColor,
      online,
      opponent,
      difficulty,
      vsCPU,
      roomId
    };
  }, [board, turn, winner, playerColor, online, opponent, difficulty, vsCPU, roomId]);

  const TURN_TIME = 15;
  const myColor = online ? playerColor : 'red';
  const opponentColor = myColor === 'red' ? 'black' : 'red';
  const isMeActive = turn === myColor;
  const isOpponentActive = turn === opponentColor;

  // Online Setup
  useEffect(() => {
    if (!online) {
      setPlayerColor('red');
      return;
    }

    if (online && user) {
      // Reset game started flag and other states whenever we re-initialize online setup
      // to prevent state leakage from previous matches in the same session.
      gameStarted.current = false;
      setIsForfeit(false);
      setWinner(null);
      setPlayerColor(null);

      // Immediate initialization for invites
      if (friendId) {
        setOpponent(prev => prev?.uid === friendId ? prev : { uid: friendId, displayName: 'Loading...' });
        setBoard(createCheckersInitialBoard());
        setTurn('red');
        
        getDoc(doc(db, 'users', friendId)).then(snap => {
          if (snap.exists()) {
            setOpponent({ uid: snap.id, ...snap.data() });
          }
        });
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

            // Set player color based on creatorId
            const myColor = isSpectator ? 'red' : (user?.uid === roomData.creatorId ? 'red' : 'black');
            if (stateRef.current.playerColor !== myColor) {
              setPlayerColor(myColor);
            }

            // Sync Game State from Firestore
            if (roomData.gameState && roomData.gameState.board) {
              const syncedBoard = typeof roomData.gameState.board === 'string' 
                ? JSON.parse(roomData.gameState.board) 
                : roomData.gameState.board;
              
              // Prevent redundant state updates that cause animation flickers/glitches
              const boardString = JSON.stringify(syncedBoard);
              const currentBoardString = JSON.stringify(stateRef.current.board);
              
              if (boardString !== currentBoardString) {
                setBoard(syncedBoard);
              }

              if (roomData.gameState.turn && roomData.gameState.turn !== stateRef.current.turn) {
                setTurn(roomData.gameState.turn);
              }
              
              // Only sync winner from Firestore if it's not null, or if we are in finished status
              if (roomData.gameState.winner !== undefined) {
                if (roomData.gameState.winner || roomData.status === 'finished') {
                  if (roomData.gameState.winner !== stateRef.current.winner) {
                    setWinner(roomData.gameState.winner);
                  }
                } else if (roomData.status === 'playing') {
                  if (stateRef.current.winner !== null) {
                    setWinner(null);
                    setIsForfeit(false);
                  }
                }
              }
            }

            if (roomData.participants.length >= 2) {
              const p1Id = roomData.participants[0];
              const p2Id = roomData.participants[1];
              const oppId = isSpectator ? p2Id : (p1Id === user?.uid ? p2Id : p1Id);

              if (isSpectator) {
                if (!profileProxy || profileProxy.uid !== p1Id) {
                  getDoc(doc(db, 'users', p1Id)).then(snap => {
                    if (snap.exists()) setProfileProxy({ uid: snap.id, ...snap.data() });
                  });
                }
              }
              
              // Aggressively clear game-over states when we have both players in a playing room
              if (roomData.status === 'playing') {
                setWinner(null);
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
                setWinner(myColor);
              }
            }
          }
        });
        return () => unsubscribe();
      }
    }
  }, [online, user, roomId, friendId]);


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
          
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Audio play failed:', e));

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
  }, [turn, winner, online, opponent]);

  const handleTimeout = () => {
    if (isHandlingTimeout.current || winner) return;
    
    const { 
      board: currentBoard, 
      turn: currentTurn, 
      playerColor: currentPlayerColor, 
      online: isOnline, 
      vsCPU: isVsCPU, 
      roomId: currentRoomId,
      opponent: currentOpponent
    } = stateRef.current;
    
    // In online mode, we MUST have playerColor to know if it's our turn
    if (isOnline && !currentPlayerColor) {
      console.log(`[Checkers] Online mode but playerColor missing. Waiting...`);
      return;
    }

    const isMyTurn = isOnline ? currentTurn === currentPlayerColor : true;
    console.log(`[Checkers] Timeout triggered. Turn: ${currentTurn}, PlayerColor: ${currentPlayerColor}, MyTurn: ${isMyTurn}`);

    if (isMyTurn) {
      isHandlingTimeout.current = true;
      
      if (isVsCPU && currentTurn === 'black') {
        makeCPUMove();
      } else if (isOnline) {
        if (!currentOpponent) {
          console.log(`[Checkers] No opponent yet, skipping punishment.`);
          isHandlingTimeout.current = false;
          return;
        }

        console.log(`[Checkers] Online Timeout: Finding random move for ${currentTurn}`);
        const allMoves: {from: {r: number, c: number}, to: {r: number, c: number}, capture?: {r: number, c: number}}[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece?.player === currentTurn) {
              const moves = getValidMoves(r, c, currentBoard);
              moves.forEach(m => {
                allMoves.push({ from: {r, c}, to: {r: m.r, c: m.c}, capture: m.capture });
              });
            }
          }
        }

        if (allMoves.length > 0) {
          const move = allMoves[Math.floor(Math.random() * allMoves.length)];
          console.log(`[Checkers] Online Timeout: Executing move`, move);
          if (socket) {
            socket.emit('make_move', { roomId: currentRoomId, move: { from: move.from, to: move.to, capture: move.capture } });
          }
          executeMove(move.from, move.to, move.capture, true);
        } else {
          console.log(`[Checkers] Online Timeout: No moves found! Forfeiting.`);
          handleForfeit();
        }
      } else if (!isOnline) {
        const nextTurn = currentTurn === 'red' ? 'black' : 'red';
        setTurn(nextTurn);
        checkGameStatus(currentBoard, nextTurn);
        setTimeLeft(TURN_TIME);
      }
    } else {
      console.log(`[Checkers] Opponent's turn timed out. Waiting for their move...`);
    }
  };

  useEffect(() => {
    if (vsCPU && turn === 'black' && !winner) {
      const timer = setTimeout(() => {
        makeCPUMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [vsCPU, turn, winner, board]);

  const makeCPUMove = () => {
    const { board: currentBoard, turn: currentTurn, difficulty: currentDifficulty } = stateRef.current;
    const allMoves: {from: {r: number, c: number}, to: {r: number, c: number}, capture?: {r: number, c: number}}[] = [];
    
    // Find all valid moves for current turn player (usually black for CPU)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece?.player === currentTurn) {
          const moves = getValidMoves(r, c, currentBoard);
          moves.forEach(m => {
            allMoves.push({ from: {r, c}, to: {r: m.r, c: m.c}, capture: m.capture });
          });
        }
      }
    }

    if (allMoves.length > 0) {
      // AI Logic based on difficulty
      let move;
      const captures = allMoves.filter(m => m.capture);

      if (currentDifficulty === 'Easy') {
        // 50% chance to make a random move even if capture is available
        if (captures.length > 0 && Math.random() > 0.5) {
          move = captures[Math.floor(Math.random() * captures.length)];
        } else {
          move = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
      } else if (currentDifficulty === 'Hard') {
        // Always capture if possible, otherwise try to move towards becoming a King
        if (captures.length > 0) {
          move = captures[Math.floor(Math.random() * captures.length)];
        } else {
          // Prefer moves that go further forward
          const forwardMoves = allMoves.sort((a, b) => b.to.r - a.to.r);
          move = forwardMoves[0];
        }
      } else {
        // Medium: Always capture if possible, otherwise random
        move = captures.length > 0 
          ? captures[Math.floor(Math.random() * captures.length)]
          : allMoves[Math.floor(Math.random() * allMoves.length)];
      }
      
      if (move) executeMove(move.from, move.to, move.capture);
    } else {
      // CPU has no moves - game over
      setWinner(currentTurn === 'red' ? 'black' : 'red');
    }
  };

  useEffect(() => {
    if (winner) return;
    checkGameStatus(board, turn);
  }, [board, turn, winner]);

  const saveMatch = async (result: string, isForfeit = false) => {
    if (!user) return;
    
    // --- Score Update (Every player updates their own score) ---
    try {
      let points = 0;
      if (result === 'Draw') {
        points = 2;
      } else if (result === playerColor) {
        points = 10;
      }
      
      if (points > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          score: increment(points),
          [`stats.checkers.wins`]: result === playerColor ? increment(1) : increment(0),
          [`stats.checkers.losses`]: (result !== 'Draw' && result !== playerColor) ? increment(1) : increment(0),
        });
      } else if (result !== 'Draw') {
        // Even if no points (defeat), update losses
        await updateDoc(doc(db, 'users', user.uid), {
          [`stats.checkers.losses`]: increment(1)
        });
      }
    } catch (error) {
      console.error("Error updating score:", error);
    }

    // --- Match Record (Only one player saves to avoid duplicates) ---
    if (online) {
      if (isForfeit) {
        if (result !== playerColor) return;
      } else {
        if (playerColor !== 'red') return;
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
        gameType: 'Checkers',
        players: playersArray,
        vsCPU: !online,
        winner: result === 'Draw' ? 'Draw' : (
          online 
            ? (result === playerColor ? user.uid : (opponent?.uid || 'Opponent'))
            : (result === 'red' ? 'Player' : 'CPU')
        ),
        createdAt: serverTimestamp(),
        mode: online ? 'online' : 'vs_cpu'
      });
    } catch (error) {
      console.error("Error saving match:", error);
    }
  };

  useEffect(() => {
    if (winner) {
      saveMatch(winner, isForfeit);
    }
  }, [winner, isForfeit]);

  const getValidMoves = (r: number, c: number, currentBoard: Square[][]) => {
    const piece = currentBoard[r][c];
    if (!piece) return [];

    const moves: {r: number, c: number, capture?: {r: number, c: number}}[] = [];
    const directions = piece.isKing ? [[1,1], [1,-1], [-1,1], [-1,-1]] : 
                     (piece.player === 'red' ? [[-1,1], [-1,-1]] : [[1,1], [1,-1]]);

    directions.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;

      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!currentBoard[nr][nc]) {
          moves.push({ r: nr, c: nc });
        } else if (currentBoard[nr][nc]?.player !== piece.player) {
          // Check for jump
          const jr = nr + dr;
          const jc = nc + dc;
          if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !currentBoard[jr][jc]) {
            moves.push({ r: jr, c: jc, capture: { r: nr, c: nc } });
          }
        }
      }
    });

    return moves;
  };

  const getWinner = (currentBoard: Square[][], currentTurn: 'red' | 'black') => {
    let redPieces = 0;
    let blackPieces = 0;
    let redHasMoves = false;
    let blackHasMoves = false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece) {
          if (piece.player === 'red') {
            redPieces++;
            if (!redHasMoves && getValidMoves(r, c, currentBoard).length > 0) {
              redHasMoves = true;
            }
          } else {
            blackPieces++;
            if (!blackHasMoves && getValidMoves(r, c, currentBoard).length > 0) {
              blackHasMoves = true;
            }
          }
        }
      }
    }

    if (redPieces === 0) return 'black';
    if (blackPieces === 0) return 'red';

    if (currentTurn === 'red' && !redHasMoves) return 'black';
    if (currentTurn === 'black' && !blackHasMoves) return 'red';

    return null;
  };

  const checkGameStatus = (currentBoard: Square[][], currentTurn: 'red' | 'black') => {
    const win = getWinner(currentBoard, currentTurn);
    if (win) {
      setWinner(win);
      return true;
    }
    return false;
  };

  const executeMove = async (from: {r: number, c: number}, to: {r: number, c: number}, capture?: {r: number, c: number}, isLocal = false) => {
    const { board: currentBoard, turn: currentTurn, roomId: currentRoomId, online: isOnlineRoom } = stateRef.current;
    console.log(`[Checkers] Executing move from [${from.r},${from.c}] to [${to.r},${to.c}]. isLocal: ${isLocal}`);
    const piece = currentBoard[from.r][from.c];
    if (!piece) {
      console.warn(`[Checkers] No piece at [${from.r},${from.c}]! Aborting move.`);
      isHandlingTimeout.current = false; // Reset to allow retry if it was a timeout
      return;
    }

    const newBoard = currentBoard.map(row => [...row]);
    const movedPiece = { ...piece };
    
    // King promotion
    if ((movedPiece.player === 'red' && to.r === 0) || (movedPiece.player === 'black' && to.r === 7)) {
      if (!movedPiece.isKing) {
        movedPiece.isKing = true;
        playSound('king');
      }
    }

    newBoard[to.r][to.c] = movedPiece;
    newBoard[from.r][from.c] = null;

    if (capture) {
      newBoard[capture.r][capture.c] = null;
      playSound('capture');
    } else {
      playSound('move');
    }

    // Derive next turn from the piece that just moved
    const nextTurn = piece.player === 'red' ? 'black' : 'red';
    
    setBoard(newBoard);
    setTurn(nextTurn);
    setSelectedPiece(null);
    setValidMoves([]);
    setTimeLeft(TURN_TIME);

    // Check for winner immediately
    checkGameStatus(newBoard, nextTurn);

    if (isOnlineRoom && currentRoomId && isLocal) {
      try {
        const win = getWinner(newBoard, nextTurn);
        // Serialize board for Firestore since nested arrays are not supported
        await updateDoc(doc(db, 'rooms', currentRoomId), {
          gameState: {
            board: JSON.stringify(newBoard),
            turn: nextTurn,
            winner: win
          }
        });
        console.log(`[Checkers] Firestore update successful for turn: ${nextTurn}`);
      } catch (error) {
        console.error("[Checkers] Firestore update failed:", error);
        // Safe way to show error to avoid "update while rendering" issues
        setTimeout(() => {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${currentRoomId}`, showError);
        }, 0);
      }
    }
  };

  const executeMoveRef = useRef(executeMove);
  useEffect(() => {
    executeMoveRef.current = executeMove;
  }, [executeMove]);

  useEffect(() => {
    if (!socket || !online || !roomId) return;

    socket.emit('join_room', roomId);

    const handleReceiveMove = (move: any) => {
      executeMoveRef.current(move.from, move.to, move.capture);
    };

    const handleOpponentForfeited = () => {
      if (!stateRef.current.winner) {
        setIsForfeit(true);
        if (stateRef.current.playerColor) {
          setWinner(stateRef.current.playerColor);
        }
      }
    };

    socket.on('receive_move', handleReceiveMove);
    socket.on('opponent_forfeited', handleOpponentForfeited);

    return () => {
      socket.off('receive_move', handleReceiveMove);
      socket.off('opponent_forfeited', handleOpponentForfeited);
    };
  }, [socket, online, roomId]);

  const onSquareClick = (r: number, c: number) => {
    if (winner || isSpectator) return;
    if (online && (!opponent || !playerColor || turn !== playerColor || isForfeit)) return;
    if (vsCPU && turn !== playerColor) return;

    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move && selectedPiece) {
      if (online && socket) {
        socket.emit('make_move', { roomId, move: { from: selectedPiece, to: {r, c}, capture: move.capture } });
      }
      executeMove(selectedPiece, {r, c}, move.capture, true);
      return;
    }

    const piece = board[r][c];
    if (piece && piece.player === turn) {
      setSelectedPiece({r, c});
      setValidMoves(getValidMoves(r, c, board));
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
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
        const oppColor = playerColor === 'red' ? 'black' : 'red';
        updateDoc(roomRef, {
          'gameState.winner': oppColor,
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
    localStorage.removeItem('checkers_offline_board');
    localStorage.removeItem('checkers_offline_turn');
    localStorage.removeItem('checkers_offline_winner');
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
      setIsForfeit(false);
      setBoard(createCheckersInitialBoard());
      setTurn('red');
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
        // Just leave without forfeiting to allow seamless resume
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
      setBoard(createCheckersInitialBoard());
      setTurn('red');
      setWinner(null);
      setIsForfeit(false);
      setTimeLeft(TURN_TIME);
      setSelectedPiece(null);
      setValidMoves([]);
      gameStarted.current = false;
    } else if (online && roomId && opponent) {
      setRematchRequested(true);
      handleOnlineRematchRequest(socket, roomId, opponent.uid, profile, 'Checkers');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-50 relative">
        <button onClick={handleExitClick} className="flex items-center gap-2 text-xs font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase">
          <X className="w-5 h-5" />
          <span>Exit Game</span>
        </button>

      {online && accessCode && !isSpectator && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
          <Lock className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-40">Code:</span>
          <span className="text-sm font-mono font-bold text-blue-400 select-all">{accessCode}</span>
        </div>
      )}
      {isSpectator && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-xl backdrop-blur-md text-purple-400">
          <Eye className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest italic">Spectator Mode</span>
        </div>
      )}
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMute}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white/40" /> : <Volume2 className="w-5 h-5 text-white/80" />}
          </button>
          <button onClick={() => setShowRules(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-[10px] font-black tracking-widest uppercase hidden sm:inline">Rules</span>
          </button>
          {online && (
            <button onClick={() => setShowChat(!showChat)} className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold flex items-center justify-center rounded-full">{unreadCount}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-12">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center relative">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2 bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">Checkers</h2>
            
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-4 sm:gap-12">
              <div className={cn(
                "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-[32px] transition-all duration-500 border relative",
                isMeActive ? (myColor === 'red' ? "bg-rose-500/10 border-rose-500/50 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)] scale-105 sm:scale-110" : "bg-slate-500/10 border-slate-500/50 shadow-[0_0_40px_-10px_rgba(148,163,184,0.3)] scale-105 sm:scale-110") : "opacity-30 border-transparent"
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
                      className={myColor === 'red' ? "text-rose-500 transition-all duration-1000 ease-linear" : "text-slate-400 transition-all duration-1000 ease-linear"}
                    />
                  </svg>
                )}
                <div className="relative">
                  <img 
                    src={profileProxy?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileProxy?.uid || 'p1'}`} 
                    className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 shadow-2xl", myColor === 'red' ? "border-rose-500" : "border-slate-700")}
                    alt="Player 1"
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn("absolute -bottom-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-lg shadow-lg flex items-center justify-center", myColor === 'red' ? "bg-rose-600" : "bg-slate-900 border border-white/10")}>
                    <div className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full", myColor === 'red' ? "bg-rose-400" : "bg-slate-400")} />
                  </div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[100px]">{profileProxy?.displayName || (isSpectator ? 'Player 1' : 'Me')}</span>
                {isMeActive && !winner && (!online || opponent) && <span className={cn("text-[10px] font-mono font-bold", myColor === 'red' ? "text-rose-400" : "text-slate-400")}>{timeLeft}s</span>}
              </div>

              <div className="text-xl sm:text-3xl font-black opacity-10 italic tracking-tighter">VS</div>

              <div className={cn(
                "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-[32px] transition-all duration-500 border relative",
                isOpponentActive ? (opponentColor === 'red' ? "bg-rose-500/10 border-rose-500/50 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)] scale-105 sm:scale-110" : "bg-slate-500/10 border-slate-500/50 shadow-[0_0_40px_-10px_rgba(148,163,184,0.3)] scale-105 sm:scale-110") : "opacity-30 border-transparent"
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
                      className={opponentColor === 'red' ? "text-rose-500 transition-all duration-1000 ease-linear" : "text-slate-400 transition-all duration-1000 ease-linear"}
                    />
                  </svg>
                )}
                <div className="relative">
                  {vsCPU ? (
                    <div className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 flex items-center justify-center border-2 shadow-2xl", opponentColor === 'red' ? "border-rose-500" : "border-slate-700")}>
                      <Grid3X3 className={cn("w-6 h-6 sm:w-8 sm:h-8", opponentColor === 'red' ? "text-rose-500" : "text-slate-400")} />
                    </div>
                  ) : (
                    <img 
                      src={opponent?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.uid || friendId || 'p2'}`} 
                      className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 shadow-2xl", opponentColor === 'red' ? "border-rose-500" : "border-slate-700")}
                      alt="Opponent"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className={cn("absolute -bottom-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-lg shadow-lg flex items-center justify-center", opponentColor === 'red' ? "bg-rose-600" : "bg-slate-900 border border-white/10")}>
                    <div className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full", opponentColor === 'red' ? "bg-rose-400" : "bg-slate-400")} />
                  </div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[100px]">{vsCPU ? 'CPU' : (opponent?.displayName || 'Opponent')}</span>
                {isOpponentActive && !winner && (!online || opponent) && <span className={cn("text-[10px] font-mono font-bold", opponentColor === 'red' ? "text-rose-400" : "text-slate-400")}>{timeLeft}s</span>}
              </div>
            </div>

            {online && !winner && (
              <div className="mt-8 h-6">
                <p className={cn(
                  "font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300",
                  (!opponent || isForfeit) ? "text-yellow-400 animate-pulse" : (turn === playerColor ? "text-green-400" : "text-white/20")
                )}>
                  {(!opponent || isForfeit) ? "Waiting for opponent..." : (turn === playerColor ? "Your Turn" : "Opponent's Turn")}
                </p>
              </div>
            )}
          </div>

          {/* Board */}
          <div className="bg-slate-900 p-2 rounded-2xl border-4 border-white/5 shadow-2xl">
            <div className="grid grid-cols-8 gap-1">
              {board?.map((row, r) => row?.map((square, c) => {
                const isDark = (r + c) % 2 !== 0;
                const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
                const isValidMove = validMoves.some(m => m.r === r && m.c === c);

                return (
                  <div 
                    key={`${r}-${c}`}
                    onClick={() => onSquareClick(r, c)}
                    className={cn(
                      "w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center relative cursor-pointer",
                      isDark ? "bg-slate-800" : "bg-slate-700/30",
                      isSelected && "ring-2 ring-blue-500 z-10 shadow-[0_0_20px_rgba(59,130,246,0.5)]",
                      isValidMove && "after:content-[''] after:w-3 after:h-3 after:bg-green-500/60 after:rounded-full after:animate-pulse"
                    )}
                  >
                    {square && (
                      <motion.div
                        layoutId={square.id}
                        initial={false}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ 
                          layout: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                        className={cn(
                          "w-8 h-8 sm:w-11 sm:h-11 rounded-full shadow-lg flex items-center justify-center border-2",
                          square.player === 'red' ? "bg-rose-600 border-rose-400" : "bg-slate-900 border-slate-700",
                          square.isKing && "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]",
                          turn === square.player && !winner && "ring-2 ring-white/20"
                        )}
                      >
                        {square.isKing && <Trophy className="w-4 h-4 text-yellow-400" />}
                      </motion.div>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>

          {/* End Game UI */}
          <AnimatePresence>
            {winner && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-8"
              >
                <div className="mb-6">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-1">
                    {winner === playerColor ? "Victory!" : "Defeat!"}
                  </h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest">
                    {winner === playerColor ? "You dominated the board" : "Better luck next time"}
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  {(vsCPU || online) && (
                    <div className="flex flex-col items-center gap-2">
                      {(vsCPU || (online && participantCount >= 2)) && !isSpectator && (
                        <RematchButton 
                          onClick={handleRematch} 
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
                    className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                  >
                    Exit
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Online Chat Sidebar */}
        <AnimatePresence>
          {showChat && online && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full lg:w-80 h-[500px]">
              <Chat socket={socket} activeRoom={{ id: roomId!, name: 'Game Chat', isPrivate: false, friendId }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Toast */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[100] bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              {opponent?.displayName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-0.5">{opponent?.displayName || 'Opponent'}</p>
              <p className="text-sm truncate">{lastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full relative">
              <button onClick={() => setShowRules(false)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 opacity-40" /></button>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-6">How to Play Checkers</h3>
              <div className="space-y-4 text-sm opacity-70">
                <p>• Move pieces diagonally forward to dark squares.</p>
                <p>• Capture opponent pieces by jumping over them to an empty square.</p>
                <p>• Reach the opponent's back row to become a King (can move backwards).</p>
                <p>• Capture all opponent pieces to win!</p>
              </div>
              <button onClick={() => setShowRules(false)} className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest">Got it!</button>
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
