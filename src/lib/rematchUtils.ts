import { doc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Socket } from 'socket.io-client';
import { createTicTacToeInitialBoard, createCheckersInitialBoard } from './gameUtils';

export const handleOnlineRematchRequest = async (
  socket: Socket | null,
  roomId: string,
  friendId: string,
  profile: any,
  gameType: string
) => {
  if (!socket || !roomId || !friendId) return;

  socket.emit('send_rematch', {
    toUserId: friendId,
    fromUser: profile,
    roomId,
    gameType
  });
};

export const handleAcceptOnlineRematch = async (
  socket: Socket | null,
  roomId: string,
  senderId: string,
  gameType: string,
  userId: string
) => {
  if (!socket || !roomId || !senderId) return;

  const initialGameState = gameType === 'Checkers' 
    ? { board: JSON.stringify(createCheckersInitialBoard()), turn: 'red', winner: null }
    : { board: createTicTacToeInitialBoard(), turn: 'X', winner: null };

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    const updateData: any = {
      participants: arrayUnion(userId, senderId),
      status: 'playing',
      rematchCount: increment(1),
      gameState: initialGameState
    };
    
    if (roomSnap.exists() && !roomSnap.data().creatorId) {
      updateData.creatorId = senderId;
    }

    await updateDoc(roomRef, updateData);
  } catch (err) {
    console.error("Error triggering rematch in Firestore:", err);
    if (roomId.startsWith('game_')) {
      await setDoc(doc(db, 'rooms', roomId), {
        name: 'Private Match',
        type: 'private',
        creatorId: senderId,
        participants: [userId, senderId],
        status: 'playing',
        gameType: gameType === 'Tic-Tac-Toe' ? 'Tic-Tac-Toe' : 'Checkers',
        createdAt: serverTimestamp(),
        rematchCount: 1,
        gameState: initialGameState
      }, { merge: true });
    }
  }

  socket.emit('join_room', roomId);
  socket.emit('accept_rematch', { roomId, gameType });
};
