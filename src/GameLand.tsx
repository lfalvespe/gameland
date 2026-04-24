import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, MessageSquare, Gamepad2, LogOut, User as UserIcon, Settings, Bell, Search, Send, Calendar, ChevronLeft, ChevronRight, X, Plus, Ban, Eye } from 'lucide-react';
import { auth, signOut, db, collection, query, where, or, and, getDoc, setDoc, updateDoc, doc, orderBy, limit, onSnapshot, addDoc, serverTimestamp, OperationType, handleFirestoreError, signInWithPopup, googleProvider, getDocs, startAfter, deleteDoc, arrayUnion, increment } from './firebase';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useError } from './ErrorContext';
import { io, Socket } from 'socket.io-client';
import { cn } from './lib/utils';
import { createCheckersInitialBoard, createTicTacToeInitialBoard } from './lib/gameUtils';

// --- Components ---

import { NotificationToast } from './components/NotificationToast';
import { handleAcceptOnlineRematch } from './lib/rematchUtils';
import { Navbar } from './components/Navbar';
import { MatchHistory } from './components/MatchHistory';

import { ProfileView } from './components/ProfileView';

import { Chat } from './components/Chat';
import { TicTacToe } from './components/TicTacToe';
import type { Difficulty } from './components/TicTacToe';

import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';

export default function GameLand() {
  const { user, profile, loading } = useAuth();
  const { showError } = useError();
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<{ id: string, name: string, isPrivate: boolean, friendId?: string, isSpectator?: boolean }>(() => {
    const saved = localStorage.getItem('gameland_active_room');
    return saved ? JSON.parse(saved) : { id: 'global', name: 'Global Chat', isPrivate: false };
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeGame, setActiveGame] = useState<string | null>(() => {
    return localStorage.getItem('gameland_active_game');
  });
  const [invite, setInvite] = useState<any>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [cpuDifficulty, setCpuDifficulty] = useState<Difficulty>(() => {
    return (localStorage.getItem('gameland_cpu_difficulty') as Difficulty) || 'Easy';
  });
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState<any>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'open' | 'private'>('open');
  const [newRoomGameType, setNewRoomGameType] = useState<string>('Tic-Tac-Toe');
  const [difficultyGame, setDifficultyGame] = useState<'Tic-Tac-Toe' | 'Checkers'>('Tic-Tac-Toe');
  const [openRooms, setOpenRooms] = useState<any[]>([]);
  const lastGlobalMessageId = useRef<string | null>(null);
  const lastPrivateMessageId = useRef<string | null>(null);
  const lastRequestId = useRef<string | null>(null);
  const isInitialGlobalMsg = useRef(true);
  const isInitialPrivateMsg = useRef(true);
  const isInitialReq = useRef(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    if (activeGame) {
      localStorage.setItem('gameland_active_game', activeGame);
    } else {
      localStorage.removeItem('gameland_active_game');
    }
  }, [activeGame]);

  useEffect(() => {
    localStorage.setItem('gameland_active_room', JSON.stringify(activeRoom));
  }, [activeRoom]);

  useEffect(() => {
    localStorage.setItem('gameland_cpu_difficulty', cpuDifficulty);
  }, [cpuDifficulty]);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'rooms'),
      and(
        or(
          where('type', '==', 'open'),
          where('status', '==', 'waiting'),
          where('participants', 'array-contains', user.uid)
        ),
        where('status', 'in', ['waiting', 'playing']),
        where('participantCount', '>', 0)
      ),
      orderBy('participantCount', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOpenRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'open_rooms', showError));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const s = io();
    setSocket(s);
    s.emit('user_online', { uid: user.uid, displayName: profile?.displayName });

    s.on('receive_game_invite', (data) => {
      if (data.toUserId === user?.uid) {
        setInvite(data);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(err => console.log('Audio playback prevented:', err));
      }
    });

    s.on('match_started', async (data) => {
      if (data.fromUserId === user?.uid || data.toUserId === user?.uid) {
        const opponentId = data.fromUserId === user?.uid ? data.toUserId : data.fromUserId;
        setActiveRoom({ id: data.roomId, name: 'Game Match', isPrivate: true, friendId: opponentId });
        
        // Ensure a room document exists in Firestore for this match (standardized session)
        try {
          const initialGameState = data.gameType === 'Checkers' 
            ? { board: JSON.stringify(createCheckersInitialBoard()), turn: 'red', winner: null }
            : data.gameType === 'Ludo'
            ? null // Ludo handles its own initialization on start
            : { board: createTicTacToeInitialBoard(), turn: 'X', winner: null };

          const roomUpdate: any = {
            name: 'Private Match',
            type: 'private',
            creatorId: data.fromUserId,
            participants: [data.fromUserId, data.toUserId],
            participantsProfiles: {
              ...(data.fromUser ? {
                [data.fromUserId]: {
                  uid: data.fromUserId,
                  displayName: data.fromUser.displayName || 'Anonymous',
                  photoURL: data.fromUser.photoURL || null
                }
              } : {}),
              ...(data.toUser ? {
                [data.toUserId]: {
                  uid: data.toUserId,
                  displayName: data.toUser.displayName || 'Anonymous',
                  photoURL: data.toUser.photoURL || null
                }
              } : {})
            },
            participantCount: 2,
            status: data.gameType === 'Ludo' ? 'waiting' : 'playing',
            gameType: data.gameType,
            createdAt: serverTimestamp(),
            rematchCount: 0
          };

          if (initialGameState) {
            roomUpdate.gameState = initialGameState;
          }

          await setDoc(doc(db, 'rooms', data.roomId), roomUpdate, { merge: true });

          if (data.gameType === 'Forca') {
            await setDoc(doc(db, 'hangman_matches', data.roomId), {
              players: [data.fromUserId, data.toUserId],
              status: 'setup',
              playerData: {},
              scores: {},
              currentRound: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        } catch (err) {
          console.error("Error initializing game room:", err);
        }

        // Map gameType to activeGame state
        const gameMap: Record<string, string> = {
          'Tic-Tac-Toe': 'tictactoe_online',
          'Checkers': 'checkers_online',
          'Ludo': 'ludo_online',
          'Forca': 'hangman_online'
        };
        setActiveGame(gameMap[data.gameType] || 'tictactoe_online');
        setInvite(null);
      }
    });

    s.on('invite_declined', (data) => {
      setInviteStatus(`${data.fromUserName} declined your game invite.`);
      setTimeout(() => setInviteStatus(null), 3000);
    });

    s.on('receive_private_message', (msg) => {
      if (msg.senderId === user?.uid) return;
      const isCurrentRoom = view === 'dashboard' && msg.roomId === activeRoom.id;
      if (isCurrentRoom) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      } else {
        const newNotif = {
          id: Math.random().toString(36).substr(2, 9),
          senderName: msg.senderName,
          senderId: msg.senderId,
          text: msg.text,
          roomId: msg.roomId,
          roomName: 'Private Message',
          type: 'message'
        };
        setNotifications(prev => [...prev, newNotif]);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
        }, 5000);
      }
    });

    s.on('receive_rematch', (data) => {
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        senderName: data.fromUser.displayName,
        senderId: data.fromUser.uid,
        text: `Requested a rematch in ${data.gameType}!`,
        roomId: data.roomId,
        roomName: 'Rematch Request',
        type: 'rematch',
        gameType: data.gameType
      };
      setNotifications(prev => [...prev, newNotif]);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    });

    // Set online status fallback
    if (user && profile && !profile.online) {
      updateDoc(doc(db, 'users', user.uid), {
        online: true,
        lastSeen: serverTimestamp()
      }).catch(err => console.error("Client-side online update failed:", err));
    }

    return () => {
      s.disconnect();
    };
  }, [user, profile?.displayName, view, activeRoom.id]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsList: any[] = [];
      const pending: any[] = [];
      const sent: any[] = [];

      for (const d of snapshot.docs) {
        const data = d.data();
        const otherUserId = data.users.find((id: string) => id !== user.uid);
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        const otherUser = otherUserDoc.exists() ? { uid: otherUserDoc.id, ...otherUserDoc.data() } : null;

        if (!otherUser) continue;

        if (data.status === 'accepted') {
          friendsList.push({ id: d.id, friend: otherUser });
        } else if (data.status === 'pending') {
          if (data.senderId === user.uid) {
            sent.push({ id: d.id, receiver: otherUser });
          } else {
            pending.push({ id: d.id, sender: otherUser });
          }
        }
      }

      setFriends(friendsList);
      setPendingRequests(pending);
      setSentRequests(sent);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest opacity-40">Loading GameLand...</p>
        </div>
      </div>
    );
  }

  if (user && profile?.banned) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/5 border border-rose-500/30 rounded-[40px] p-12 text-center"
        >
          <div className="inline-flex p-6 rounded-3xl bg-rose-500/10 mb-8">
            <Ban className="w-16 h-16 text-rose-500" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Account Banned</h1>
          <p className="text-sm opacity-60 mb-8 leading-relaxed">
            Your account has been suspended for violating our community guidelines. 
            If you believe this is a mistake, please contact support.
          </p>
          <button 
            onClick={() => signOut(auth)}
            className="w-full py-4 bg-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all"
          >
            Logout
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!user ? (
        <Login />
      ) : (
        <>
          <Navbar 
            onViewProfile={() => { setViewingProfileId(null); setView('profile'); }} 
            onViewDashboard={() => setView('dashboard')} 
            pendingRequestsCount={pendingRequests.length}
          />
          {view === 'dashboard' ? (
            <Dashboard 
              activeRoom={activeRoom} 
              setActiveRoom={setActiveRoom} 
              pendingRequests={pendingRequests}
              sentRequests={sentRequests}
              friends={friends}
              view={view}
              notifications={notifications}
              setNotifications={setNotifications}
              socket={socket}
              activeGame={activeGame}
              setActiveGame={setActiveGame}
              invite={invite}
              setInvite={setInvite}
              inviteStatus={inviteStatus}
              setInviteStatus={setInviteStatus}
              cpuDifficulty={cpuDifficulty}
              setCpuDifficulty={setCpuDifficulty}
              showDifficultySelect={showDifficultySelect}
              setShowDifficultySelect={setShowDifficultySelect}
              invitingFriend={invitingFriend}
              setInvitingFriend={setInvitingFriend}
              showCreateRoom={showCreateRoom}
              setShowCreateRoom={setShowCreateRoom}
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              newRoomType={newRoomType}
              setNewRoomType={setNewRoomType}
              newRoomGameType={newRoomGameType}
              setNewRoomGameType={setNewRoomGameType}
              difficultyGame={difficultyGame}
              setDifficultyGame={setDifficultyGame}
              openRooms={openRooms}
              onViewUserProfile={(uid: string) => { setViewingProfileId(uid); setView('profile'); }}
            />
          ) : (
            <ProfileView 
              onBack={() => setView('dashboard')} 
              targetUserId={viewingProfileId || undefined}
              onMessage={async (targetUser: any) => {
                if (!user) return;
                const roomId = [user.uid, targetUser.uid].sort().join('_');
                try {
                  const roomDoc = await getDoc(doc(db, 'rooms', roomId));
                  if (!roomDoc.exists()) {
                    await setDoc(doc(db, 'rooms', roomId), {
                      participants: [user.uid, targetUser.uid],
                      type: 'private',
                      createdAt: serverTimestamp()
                    });
                  }
                  setActiveRoom({ id: roomId, name: targetUser.displayName, isPrivate: true, friendId: targetUser.uid });
                  setView('dashboard');
                } catch (error) {
                  handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`, showError);
                }
              }}
              onInvite={(targetUser: any) => {
                setInvitingFriend(targetUser);
                setView('dashboard');
              }}
            />
          )}

          <AnimatePresence>
            {notifications.map(n => (
              <NotificationToast 
                key={n.id} 
                notification={n} 
                onClose={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))} 
                onClick={() => {
                  if (n.type === 'message') {
                    setView('dashboard');
                    setActiveRoom({ 
                      id: n.roomId, 
                      name: n.senderName, 
                      isPrivate: true, 
                      friendId: n.senderId 
                    });
                    setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                  } else if (n.type === 'rematch') {
                    handleAcceptOnlineRematch(socket, n.roomId, n.senderId, n.gameType, user!.uid);
                    setView('dashboard');
                    setActiveRoom({ 
                      id: n.roomId, 
                      name: n.gameType === 'Tic-Tac-Toe' ? 'Tic-Tac-Toe' : 'Checkers', 
                      isPrivate: n.roomId.startsWith('game_'),
                      friendId: n.senderId 
                    });
                    setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                  }
                }}
                onDecline={() => {
                  setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                }}
              />
            ))}
          </AnimatePresence>

          <footer className="py-8 px-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 opacity-40">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">GameLand &copy; {new Date().getFullYear()}</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest">
                Developed by <span className="text-blue-400">Fernando Alves</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
