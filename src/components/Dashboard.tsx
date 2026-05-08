import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid3X3, Disc, Trophy, MessageSquare, Users, Plus, Search, Bell, X, User as UserIcon, ShieldAlert, Ban, CheckCircle, UserCheck, Info, HelpCircle, Lock, Key, Eye, TrendingUp } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { db, collection, query, where, orderBy, limit, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, OperationType, handleFirestoreError, getDoc, arrayUnion, onSnapshot, increment } from '../firebase';
import { normalizeString } from '../lib/stringUtils';
import { cn } from '../lib/utils';
import { Chat } from './Chat';
import { TicTacToe } from './TicTacToe';
import { Checkers } from './Checkers';
import { Ludo } from './Ludo';
import { Hangman } from './Hangman';
import { MatchHistory } from './MatchHistory';
import type { Difficulty } from './TicTacToe';

const GAME_MAX_PLAYERS: Record<string, number> = {
  'Tic-Tac-Toe': 2,
  'Checkers': 2,
  'Ludo': 4,
  'Forca Batalha': 6,
  'Forca Clássico': 6
};

const GameCard = ({ title, description, icon: Icon, image, iconColor, bgColor, onLocal, onCreateRoom, onInfo, comingSoon }: any) => (
  <motion.div 
    whileHover={comingSoon ? {} : "hover"}
    className={cn(
      "relative group overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col items-center text-center gap-4 transition-all",
      comingSoon ? "opacity-60 cursor-not-allowed grayscale" : "hover:border-white/20"
    )}
    variants={{
      hover: { 
        scale: 1.03, 
        y: -5,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }
    }}
  >
    <motion.div 
      variants={{
        hover: { rotate: 12, scale: 1.1 }
      }}
      className={cn("p-2 rounded-2xl transition-colors relative z-10 w-32 h-32 flex items-center justify-center overflow-hidden shadow-lg", bgColor)}
    >
      {image ? (
        <img src={image} alt={title} className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
      ) : (
        <Icon className={cn("w-12 h-12", iconColor)} />
      )}
    </motion.div>
    <div className="relative z-10">
      <h3 className="text-xl font-bold mb-2 flex items-center gap-2 justify-center">
        {title}
        {comingSoon && <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Soon</span>}
      </h3>
      <p className="text-sm opacity-60 line-clamp-2">{description}</p>
    </div>

    {!comingSoon && (
      <div className="flex items-center gap-2 w-full mt-2 relative z-20">
        <button 
          onClick={onLocal}
          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Local
        </button>
        <button 
          onClick={onCreateRoom}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
        >
          Criar Sala
        </button>
      </div>
    )}

    {onInfo && !comingSoon && (
      <button 
        onClick={(e) => { e.stopPropagation(); onInfo(); }}
        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all z-20"
      >
        <Info className="w-4 h-4 opacity-40 hover:opacity-100" />
      </button>
    )}
    {!comingSoon && <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
  </motion.div>
);

export const Dashboard = ({ activeRoom, setActiveRoom, pendingRequests, sentRequests, friends, view, setNotifications, socket, activeGame, setActiveGame, invite, setInvite, inviteStatus, setInviteStatus, cpuDifficulty, setCpuDifficulty, showDifficultySelect, setShowDifficultySelect, difficultyGame, setDifficultyGame, invitingFriend, setInvitingFriend, showCreateRoom, setShowCreateRoom, newRoomName, setNewRoomName, newRoomType, setNewRoomType, newRoomGameType, setNewRoomGameType, openRooms, notifications, onViewUserProfile }: any) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [searchQuery, setSearchQuery] = useState('');

  const games = [
    { 
      id: 'Tic-Tac-Toe', 
      title: 'Jogo da Velha',
      description: 'A clássica batalha de X contra O. Jogue contra amigos ou IA.',
      image: '/icons/tic-tac-toe.png',
      icon: Grid3X3, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      longDescription: 'Domine a grade neste jogo de estratégia atemporal. Desafie o computador ou convide um amigo para testar sua inteligência em partidas em tempo real.'
    },
    { 
      id: 'Checkers', 
      title: 'Damas',
      description: 'Jogo de tabuleiro clássico de estratégia e habilidade.',
      image: '/icons/checkers.png',
      icon: Disc, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10',
      longDescription: 'Pule, capture e coroe suas peças rumo à vitória. Uma experiência tática profunda que diverte há séculos, agora reimaginada no GameLand.'
    },
    { 
      id: 'Ludo', 
      title: 'Ludo',
      description: 'Leve suas peças para casa nesta corrida pela vitória.',
      image: '/icons/ludo.png',
      icon: Trophy, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10',
      longDescription: 'Um favorito da família que combina sorte e estratégia. Jogue os dados, mova suas peças e seja o primeiro a levar as quatro peças para casa.'
    },
    { 
      id: 'Hangman', 
      title: 'Forca Batalha',
      description: 'Adivinhe a palavra secreta antes de ser enforcado.',
      image: '/icons/forca-battle.png',
      icon: Users, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10',
      longDescription: 'Teste seu vocabulário neste clássico jogo de palavras. Uma palavra secreta, poucas chances. Você consegue adivinhar?'
    },
    { 
      id: 'Snakes-Ladders', 
      title: 'Cobras e Escadas',
      description: 'Suba as escadas e fuja das cobras!',
      image: '/icons/snakes-and-ladders.png',
      icon: Trophy, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      comingSoon: true,
      longDescription: 'O clássico Snakes and Ladders está chegando! Uma corrida emocionante onde a sorte nos dados decide se você sobe ao topo ou escorrega pro início.'
    },
    { 
      id: 'Hangman-Classic', 
      title: 'Forca Clássico',
      description: 'Adivinhe a palavra secreta na versão clássica.',
      image: '/icons/forca-classic.png',
      icon: Users, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10',
      longDescription: 'A versão clássica da Forca! Jogue sozinho ou desafie amigos para ver quem adivinha a palavra secreta primeiro. Diversos temas e dificuldades!'
    },
  ];

  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % games.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [games.length]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userToToggleBan, setUserToToggleBan] = useState<any | null>(null);
  const [showRulesFor, setShowRulesFor] = useState<string | null>(null);
  const [privateChatPreviews, setPrivateChatPreviews] = useState<Record<string, any>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModerationUsers, setShowModerationUsers] = useState(false);
  const [resetInput, setResetInput] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rooms'),
      where('participants', 'array-contains', user.uid),
      where('type', '==', 'private')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const previews: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.lastMessage) {
          previews[doc.id] = {
            text: data.lastMessage,
            senderId: data.lastSenderId,
            at: data.lastMessageAt
          };
        }
      });
      setPrivateChatPreviews(previews);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'moderator') {
      const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
          const q = query(collection(db, 'users'), orderBy('displayName', 'asc'), limit(50));
          const snap = await getDocs(q);
          setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users/all', showError);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchAllUsers();
    }
  }, [profile?.role]);

  const toggleBan = async () => {
    if (!userToToggleBan) return;
    const newStatus = !userToToggleBan.banned;
    
    try {
      await updateDoc(doc(db, 'users', userToToggleBan.uid), {
        banned: newStatus
      });
      setAllUsers(prev => prev.map(u => u.uid === userToToggleBan.uid ? { ...u, banned: newStatus } : u));
      setInviteStatus(`${userToToggleBan.displayName} has been ${newStatus ? 'banned' : 'unbanned'}.`);
      setUserToToggleBan(null);
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userToToggleBan.uid}`, showError);
    }
  };

  const resetAllMatchData = async () => {
    if (resetInput !== 'RESET') {
       setInviteStatus("Error: You must type 'RESET' exactly.");
       setTimeout(() => setInviteStatus(null), 3000);
       return;
    }

    setShowResetConfirm(false);
    setResetInput('');
    setLoadingUsers(true);
    try {
      // 1. Delete all matches from the shared history
      const matchesSnap = await getDocs(collection(db, 'matches'));
      const deleteMatchPromises = matchesSnap.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));
      await Promise.all(deleteMatchPromises);

      // 2. Reset all users (score and stats)
      const usersSnap = await getDocs(collection(db, 'users'));
      const initialStats = {
        ticTacToe: { wins: 0, losses: 0, draws: 0 },
        checkers: { wins: 0, losses: 0, draws: 0 },
        ludo: { wins: 0, losses: 0 },
        hangman: { wins: 0, losses: 0, draws: 0, total: 0, totalMistakes: 0, themesPlayed: {} },
        snakesLadders: { wins: 0, losses: 0 }
      };

      const userResetPromises = usersSnap.docs.map(d => updateDoc(doc(db, 'users', d.id), {
        score: 0,
        stats: initialStats
      }));
      await Promise.all(userResetPromises);

      // 3. Clear hangman sessions (active or old)
      const hangmanMatchesSnap = await getDocs(collection(db, 'hangman_matches'));
      const hangmanDeletePromises = hangmanMatchesSnap.docs.map(d => deleteDoc(doc(db, 'hangman_matches', d.id)));
      await Promise.all(hangmanDeletePromises);

      // 4. Clear rooms
      const roomsSnap = await getDocs(collection(db, 'rooms'));
      const deleteRoomsPromises = roomsSnap.docs.map(d => deleteDoc(doc(db, 'rooms', d.id)));
      await Promise.all(deleteRoomsPromises);

      // 5. Clear messages
      const messagesSnap = await getDocs(collection(db, 'messages'));
      const deleteMessagesPromises = messagesSnap.docs.map(d => deleteDoc(doc(db, 'messages', d.id)));
      await Promise.all(deleteMessagesPromises);

      setInviteStatus("MASTER RESET COMPLETE: All history, rooms, and messages wiped.");
      setTimeout(() => setInviteStatus(null), 5000);
      
      // Refresh user list to show 0 scores
      const q = query(collection(db, 'users'), orderBy('displayName', 'asc'), limit(50));
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch (error) {
      console.error("Master Reset error:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'system/master_reset', showError);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (queryStr: string) => {
    setIsSearching(true);
    const normalizedQuery = normalizeString(queryStr);
    try {
      // 1. Try search by normalized name (covers case and accents)
      const q = query(
        collection(db, 'users'),
        where('displayName_normalized', '>=', normalizedQuery),
        where('displayName_normalized', '<=', normalizedQuery + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);
      let results = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== user?.uid);
      
      // 2. If no results, try search by email (exact match or prefix)
      if (results.length < 3) {
        const qEmail = query(
          collection(db, 'users'),
          where('email', '>=', queryStr.toLowerCase()),
          where('email', '<=', queryStr.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snapEmail = await getDocs(qEmail);
        const emailResults = snapEmail.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.uid !== user?.uid && !results.some(r => r.uid === u.uid));
        results = [...results, ...emailResults];
      }

      // 3. Last fallback: Try case-sensitive original name if normalized results are still low
      if (results.length === 0) {
        const qFallback = query(
          collection(db, 'users'),
          where('displayName', '>=', queryStr),
          where('displayName', '<=', queryStr + '\uf8ff'),
          limit(5)
        );
        const snapFallback = await getDocs(qFallback);
        const fallbackResults = snapFallback.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.uid !== user?.uid && !results.some(r => r.uid === u.uid));
        results = [...results, ...fallbackResults];
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      // Silently fail or handle error - sometimes indexes are missing
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [joiningRoom, setJoiningRoom] = useState<any>(null);
  const [entryCode, setEntryCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const createRoom = async () => {
    if (!user || !newRoomName.trim()) return;
    try {
      const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
      const accessCode = newRoomType === 'private' ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      
      await setDoc(doc(db, 'rooms', roomId), {
        name: newRoomName,
        type: newRoomType,
        creatorId: user.uid,
        creatorName: profile?.displayName || 'Anonymous',
        gameType: newRoomGameType,
        accessCode: accessCode,
        createdAt: serverTimestamp(),
        participants: [user.uid],
        participantCount: 1,
        participantsProfiles: {
          [user.uid]: {
            displayName: profile?.displayName || 'Anonymous',
            photoURL: profile?.photoURL || null
          }
        },
        status: 'waiting'
      });

      if (newRoomGameType === 'Forca Batalha' || newRoomGameType === 'Forca Clássico') {
        const variant = newRoomGameType === 'Forca Clássico' ? 'classic' : 'battle';
        await setDoc(doc(db, 'hangman_matches', roomId), {
          players: [user.uid],
          status: 'setup',
          variant,
          playerData: {},
          scores: {},
          currentRound: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setActiveRoom({ id: roomId, name: newRoomName, isPrivate: newRoomType === 'private' });
      
      const gameMap: Record<string, string> = {
        'Tic-Tac-Toe': 'tictactoe_online',
        'Checkers': 'checkers_online',
        'Ludo': 'ludo_online',
        'Forca Batalha': 'hangman_online',
        'Forca Clássico': 'hangman_classic_online'
      };
      setActiveGame(gameMap[newRoomGameType] || 'tictactoe_online');
      setShowCreateRoom(false);
      setNewRoomName('');
      setInviteStatus(`Room "${newRoomName}" created!`);
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms', showError);
    }
  };

  const joinRoom = async (room: any, asSpectator = false) => {
    if (!user) return;
    
    // If private and user not creator/participant, ask for code
    if (room.type === 'private' && room.creatorId !== user.uid && !room.participants.includes(user.uid)) {
      setJoiningRoom({ ...room, asSpectator });
      setEntryCode('');
      setCodeError(null);
      return;
    }

    try {
      const gameMap: Record<string, string> = {
        'Tic-Tac-Toe': 'tictactoe_online',
        'Checkers': 'checkers_online',
        'Ludo': 'ludo_online',
        'Forca Batalha': 'hangman_online',
        'Forca Clássico': 'hangman_classic_online'
      };

      const maxPlayers = GAME_MAX_PLAYERS[room.gameType] || 2;
      const isFull = (room.participantCount || 0) >= maxPlayers;
      const isPlaying = room.status === 'playing';

      if (room.creatorId === user.uid || room.participants.includes(user.uid) || asSpectator) {
        setActiveRoom({ 
          id: room.id, 
          name: room.name, 
          isPrivate: room.type === 'private',
          isSpectator: asSpectator && !room.participants.includes(user.uid)
        });
        setActiveGame(gameMap[room.gameType] || 'tictactoe_online');
        return;
      }

      // Block joining if full or already playing
      if (isFull || isPlaying) {
        setActiveRoom({ 
          id: room.id, 
          name: room.name, 
          isPrivate: room.type === 'private',
          isSpectator: true
        });
        setActiveGame(gameMap[room.gameType] || 'tictactoe_online');
        return;
      }

      const willBeFull = (room.participantCount || 0) + 1 >= maxPlayers;
      // Ludo always starts in waiting state until creator starts it
      const nextStatus = room.gameType === 'Ludo' ? 'waiting' : (willBeFull ? 'playing' : 'waiting');

      if (room.gameType === 'Forca Batalha' || room.gameType === 'Forca Clássico') {
        try {
          await updateDoc(doc(db, 'hangman_matches', room.id), {
            players: arrayUnion(user.uid),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `hangman_matches/${room.id}`, showError);
          return;
        }
      }

      await updateDoc(doc(db, 'rooms', room.id), {
        participants: arrayUnion(user.uid),
        participantCount: increment(1),
        [`participantsProfiles.${user.uid}`]: {
          displayName: profile?.displayName || 'Anonymous',
          photoURL: profile?.photoURL || null
        },
        status: nextStatus
      });
      setActiveRoom({ id: room.id, name: room.name, isPrivate: room.type === 'private', friendId: room.creatorId });
      setActiveGame(gameMap[room.gameType] || 'tictactoe_online');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`, showError);
    }
  };

  const verifyAndJoin = async () => {
    if (!joiningRoom || !user) return;
    if (entryCode !== joiningRoom.accessCode) {
      setCodeError('Invalid room code. Please check and try again.');
      return;
    }

    try {
      const gameMap: Record<string, string> = {
        'Tic-Tac-Toe': 'tictactoe_online',
        'Checkers': 'checkers_online',
        'Ludo': 'ludo_online',
        'Forca Batalha': 'hangman_online',
        'Forca Clássico': 'hangman_classic_online'
      };

      const maxPlayers = GAME_MAX_PLAYERS[joiningRoom.gameType] || 2;
      if (joiningRoom.asSpectator) {
        setActiveRoom({ 
          id: joiningRoom.id, 
          name: joiningRoom.name, 
          isPrivate: true,
          isSpectator: true
        });
        setActiveGame(gameMap[joiningRoom.gameType] || 'tictactoe_online');
      } else {
        const willBeFull = (joiningRoom.participantCount || 0) + 1 >= maxPlayers;
        // Ludo always starts in waiting state until creator starts it
        const nextStatus = joiningRoom.gameType === 'Ludo' ? 'waiting' : (willBeFull ? 'playing' : 'waiting');

        if (joiningRoom.gameType === 'Forca Batalha' || joiningRoom.gameType === 'Forca Clássico') {
          try {
            await updateDoc(doc(db, 'hangman_matches', joiningRoom.id), {
              players: arrayUnion(user.uid),
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `hangman_matches/${joiningRoom.id}`, showError);
            return;
          }
        }

        await updateDoc(doc(db, 'rooms', joiningRoom.id), {
          participants: arrayUnion(user.uid),
          participantCount: increment(1),
          [`participantsProfiles.${user.uid}`]: {
            displayName: profile?.displayName || 'Anonymous',
            photoURL: profile?.photoURL || null
          },
          status: nextStatus
        });
        
        setActiveRoom({ id: joiningRoom.id, name: joiningRoom.name, isPrivate: true, friendId: joiningRoom.creatorId });
        setActiveGame(gameMap[joiningRoom.gameType] || 'tictactoe_online');
      }
      setJoiningRoom(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${joiningRoom.id}`, showError);
    }
  };

  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [globalRanking, setGlobalRanking] = useState<any[]>([]);

  const getBestGame = () => {
    const stats = profile?.stats || {};
    const games = [
      { id: 'Tic-Tac-Toe', wins: stats.ticTacToe?.wins || 0, image: '/icons/tic-tac-toe.png', icon: Grid3X3, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { id: 'Checkers', wins: stats.checkers?.wins || 0, image: '/icons/checkers.png', icon: Disc, color: 'text-rose-400', bg: 'bg-rose-400/10' },
      { id: 'Ludo', wins: stats.ludo?.wins || 0, image: '/icons/ludo.png', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { id: 'Hangman', wins: stats.hangman?.wins || 0, image: '/icons/forca-battle.png', icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { id: 'Snakes-Ladders', wins: stats.snakesLadders?.wins || 0, image: '/icons/snakes-and-ladders.png', icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    ];
    
    const sorted = [...games].sort((a, b) => b.wins - a.wins);
    return sorted[0].wins > 0 ? sorted[0] : null;
  };

  const bestGame = getBestGame();

  const getMostPlayedGame = () => {
    const stats = profile?.stats || {};
    const games = [
      { 
        id: 'Tic-Tac-Toe', 
        total: (stats.ticTacToe?.wins || 0) + (stats.ticTacToe?.losses || 0) + (stats.ticTacToe?.draws || 0), 
        image: '/icons/tic-tac-toe.png',
        icon: Grid3X3, color: 'text-purple-400', bg: 'bg-purple-400/10' 
      },
      { 
        id: 'Checkers', 
        total: (stats.checkers?.wins || 0) + (stats.checkers?.losses || 0) + (stats.checkers?.draws || 0), 
        image: '/icons/checkers.png',
        icon: Disc, color: 'text-rose-400', bg: 'bg-rose-500/10' 
      },
      { 
        id: 'Ludo', 
        total: (stats.ludo?.wins || 0) + (stats.ludo?.losses || 0) + (stats.ludo?.draws || 0), 
        image: '/icons/ludo.png',
        icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10' 
      },
      { 
        id: 'Hangman', 
        total: (stats.hangman?.wins || 0) + (stats.hangman?.losses || 0) + (stats.hangman?.draws || 0) + (stats.hangman?.total || 0), 
        image: '/icons/forca-battle.png',
        icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' 
      },
      { 
        id: 'Snakes-Ladders', 
        total: (stats.snakesLadders?.wins || 0) + (stats.snakesLadders?.losses || 0), 
        image: '/icons/snakes-and-ladders.png',
        icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-400/10' 
      },
    ];
    
    const sorted = [...games].sort((a, b) => b.total - a.total);
    return sorted[0].total > 0 ? sorted[0] : null;
  };

  const mostPlayed = getMostPlayedGame();

  // Split ranking into its own effect - only needs to run once or on user change
  useEffect(() => {
    if (!user) return;
    const fetchRanking = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
        const snap = await getDocs(q);
        setGlobalRanking(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users/ranking', showError);
      }
    };
    fetchRanking();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    const fetchSuggestions = async () => {
      // Only show loading on initial load to avoid flickering
      if (suggestions.length === 0) setLoadingSuggestions(true);
      
      try {
        // 1. Fetch current user's match history to find game interests (limit 1 for basic profile check)
        const myMatchesSnap = await getDocs(query(
          collection(db, 'matches'),
          where('players', 'array-contains', user.uid),
          limit(10)
        ));
        const myGameTypes = new Set(myMatchesSnap.docs.map(d => d.data().gameType));

        // 2. Fetch candidates (recently active users)
        const candidatesSnap = await getDocs(query(
          collection(db, 'users'),
          orderBy('lastSeen', 'desc'),
          limit(20)
        ));

        const scoredCandidates = await Promise.all(candidatesSnap.docs.map(async (docSnap) => {
          const u = { uid: docSnap.id, ...docSnap.data() } as any;
          
          // Skip self
          if (u.uid === user.uid) return null;
          
          // Check friendship using the deterministic ID to avoid broad queries
          const friendshipId = [user.uid, u.uid].sort().join('_');
          try {
            const existingFriendship = await getDoc(doc(db, 'friendships', friendshipId));
            if (existingFriendship.exists()) return null;
          } catch (e) {
            // If we can't read it, assume it exists or we shouldn't suggest it
            return null;
          }

          let score = 0;

          // Activity (Weight: 30 if online, 10 if recent)
          if (u.online) score += 30;
          const lastSeen = u.lastSeen ? (u.lastSeen.toDate ? u.lastSeen.toDate().getTime() : new Date(u.lastSeen).getTime()) : 0;
          if (Date.now() - lastSeen < 3600000) score += 10;

          // Score by score/rank proximity (Weight: 20 for close rank)
          const myScore = profile?.score || 0;
          const theirScore = u.score || 0;
          const scoreDiff = Math.abs(myScore - theirScore);
          if (scoreDiff < 50) score += 20;
          else if (scoreDiff < 200) score += 10;
          else if (scoreDiff < 1000) score += 5;

          // Simple keyword/game match if they have any matches (optional)
          // We omit the 'theirMatches' query to save on read costs and avoid permission snags
          
          return { ...u, suggestionScore: score, mutualCount: 0 };
        }));

        setSuggestions(
          scoredCandidates
            .filter((u): u is any => u !== null && u.suggestionScore > 0)
            .sort((a, b) => b.suggestionScore - a.suggestionScore)
            .slice(0, 4)
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'suggestions', showError);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [user?.uid, friends.length]);

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    const friendshipId = [user.uid, targetUserId].sort().join('_');
    try {
      // Check if friendship already exists
      const existingDoc = await getDoc(doc(db, 'friendships', friendshipId));
      if (existingDoc.exists()) {
        const data = existingDoc.data();
        if (data.status === 'accepted') {
          setInviteStatus('You are already friends!');
        } else if (data.status === 'pending') {
          if (data.senderId === user.uid) {
            setInviteStatus('Friend request already sent!');
          } else {
            setInviteStatus('This user already sent you a request!');
          }
        } else {
          // If rejected, let's allow sending again (reset to pending)
          await updateDoc(doc(db, 'friendships', friendshipId), {
            status: 'pending',
            senderId: user.uid,
            createdAt: serverTimestamp()
          });
          setInviteStatus('Friend request sent!');
        }
      } else {
        await setDoc(doc(db, 'friendships', friendshipId), {
          users: [user.uid, targetUserId],
          senderId: user.uid,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        setInviteStatus('Friend request sent!');
      }
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `friendships/${friendshipId}`, showError);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendships', requestId), {
        status: 'accepted'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `friendships/${requestId}`, showError);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendships', requestId), {
        status: 'rejected'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `friendships/${requestId}`, showError);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'friendships', requestId));
      setInviteStatus('Friend request cancelled.');
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `friendships/${requestId}`, showError);
    }
  };

  const acceptInvite = () => {
    if (!socket || !user || !invite) return;
    const roomId = `game_${[invite.fromUser.uid, user.uid].sort().join('_')}`;
    
    // Optimistic UI feedback
    setInvite((prev: any) => prev ? { ...prev, accepting: true } : null);
    
    socket.emit('accept_invite', { 
      roomId, 
      fromUserId: invite.fromUser.uid, 
      toUserId: user.uid,
      gameType: invite.gameType,
      fromUser: invite.fromUser,
      toUser: { uid: user.uid, displayName: profile?.displayName, photoURL: profile?.photoURL }
    });
  };

  const declineInvite = () => {
    if (!socket || !user || !invite) return;
    socket.emit('decline_invite', { 
      fromUserId: invite.fromUser.uid, 
      toUserId: user.uid,
      fromUserName: profile?.displayName || 'A friend'
    });
    setInvite(null);
  };

  const sendGameInvite = (friend: any, gameType: string = 'Tic-Tac-Toe') => {
    if (!socket || !user) return;
    socket.emit('send_game_invite', {
      toUserId: friend.uid,
      fromUser: { uid: user.uid, displayName: profile?.displayName },
      gameType: gameType
    });
    setInviteStatus(`Invite for ${gameType} sent to ${friend.displayName}!`);
    setInvitingFriend(null);
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const openPrivateChat = async (friend: any) => {
    if (!user) return;
    
    // Create a deterministic room ID for 1:1 chat
    const roomId = [user.uid, friend.uid].sort().join('_');
    
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (!roomDoc.exists()) {
        await setDoc(doc(db, 'rooms', roomId), {
          participants: [user.uid, friend.uid],
          type: 'private',
          name: `Chat with ${friend.displayName}`,
          status: 'playing',
          createdAt: serverTimestamp()
        });
      }
      setActiveRoom({ id: roomId, name: friend.displayName, isPrivate: true, friendId: friend.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`, showError);
    }
  };

  const hasIncomingRematch = notifications?.some((n: any) => n.type === 'rematch' && n.roomId === activeRoom.id);

  if (activeGame === 'tictactoe_cpu') return <TicTacToe vsCPU difficulty={cpuDifficulty} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'tictactoe_local') return <TicTacToe onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'tictactoe_online') return <TicTacToe online socket={socket} roomId={activeRoom.id} friendId={activeRoom.friendId} hasIncomingRematch={hasIncomingRematch} isSpectator={activeRoom.isSpectator} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'checkers_local') return <Checkers vsCPU difficulty={cpuDifficulty} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'checkers_online') return <Checkers online socket={socket} roomId={activeRoom.id} friendId={activeRoom.friendId} hasIncomingRematch={hasIncomingRematch} isSpectator={activeRoom.isSpectator} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'ludo_local') return <Ludo vsCPU initialPlayerCount={2} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'ludo_local_4') return <Ludo vsCPU initialPlayerCount={4} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'ludo_online') return <Ludo online socket={socket} roomId={activeRoom.id} isSpectator={activeRoom.isSpectator} onBack={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'hangman_local') return <Hangman mode="local" onClose={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'hangman_online') return <Hangman mode="online" matchId={activeRoom.id} opponentId={activeRoom.friendId} onClose={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'hangman_classic_local') return <Hangman mode="local" variant="classic" onClose={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;
  if (activeGame === 'hangman_classic_online') return <Hangman mode="online" variant="classic" matchId={activeRoom.id} opponentId={activeRoom.friendId} onClose={() => { setActiveGame(null); setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }); }} />;

  return (
    <div className="pt-20 sm:pt-36 px-4 sm:px-6 pb-12 max-w-7xl mx-auto relative cursor-default">
      <AnimatePresence>
        {showDifficultySelect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl"
            >
              <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-6">
                {difficultyGame === 'Tic-Tac-Toe' ? (
                  <Grid3X3 className="w-12 h-12 text-blue-400" />
                ) : difficultyGame === 'Checkers' ? (
                  <Disc className="w-12 h-12 text-rose-400" />
                ) : (
                  <Trophy className="w-12 h-12 text-yellow-400" />
                )}
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Select Difficulty</h2>
              <p className="text-sm opacity-60 mb-8">Challenge the CPU at your preferred skill level.</p>
              
              <div className="flex flex-col gap-3">
                {difficultyGame === 'Ludo' ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveGame('ludo_local');
                        setShowDifficultySelect(false);
                      }}
                      className="py-4 rounded-2xl font-bold text-lg transition-all border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                    >
                      2 Players (User vs Bot)
                    </button>
                    <button
                      onClick={() => {
                        setActiveGame('ludo_local_4');
                        setShowDifficultySelect(false);
                      }}
                      className="py-4 rounded-2xl font-bold text-lg transition-all border bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                    >
                      4 Players (User vs 3 Bots)
                    </button>
                  </>
                ) : (
                  (['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setCpuDifficulty(level);
                        setActiveGame(difficultyGame === 'Tic-Tac-Toe' ? 'tictactoe_cpu' : 'checkers_local');
                        setShowDifficultySelect(false);
                      }}
                      className={cn(
                        "py-4 rounded-2xl font-bold text-lg transition-all border",
                        level === 'Easy' ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20" :
                        level === 'Medium' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                      )}
                    >
                      {level}
                    </button>
                  ))
                )}
                <button 
                  onClick={() => setShowDifficultySelect(false)}
                  className="mt-4 text-xs uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mb-12 relative h-[300px] sm:h-[450px] overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/10 bg-slate-900 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div 
            key={games[currentFeaturedIndex].id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col justify-center sm:justify-end p-5 sm:p-16"
          >
            {/* Background Gradients */}
            <div className={cn("absolute inset-0 opacity-20 transition-all duration-1000", games[currentFeaturedIndex].bg.replace('/10', '/30'))} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="relative z-10 max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-2 sm:mb-4"
              >
                <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl text-white", games[currentFeaturedIndex].bg)}>
                  {React.createElement(games[currentFeaturedIndex].icon, { className: cn("w-5 h-5 sm:w-6 sm:h-6", games[currentFeaturedIndex].color) })}
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-blue-400 uppercase">Jogo em Destaque</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-7xl font-black italic uppercase tracking-tighter mb-2 sm:mb-4 text-white drop-shadow-xl"
              >
                {games[currentFeaturedIndex].title}
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs sm:text-lg text-white/60 mb-4 sm:mb-8 max-w-lg leading-relaxed font-medium line-clamp-2 sm:line-clamp-none"
              >
                {games[currentFeaturedIndex].longDescription}
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-3 sm:gap-4"
              >
                <button 
                  onClick={() => {
                    const game = games[currentFeaturedIndex];
                    if (game.id === 'Tic-Tac-Toe' || game.id === 'Checkers' || game.id === 'Ludo') {
                      setDifficultyGame(game.id);
                      setShowDifficultySelect(true);
                    } else if (game.id === 'Hangman') {
                      setActiveGame('hangman_local');
                    }
                  }}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                >
                  Jogar Agora
                </button>
                <button 
                  onClick={() => setShowRulesFor(games[currentFeaturedIndex].id === 'Hangman' ? 'Forca' : games[currentFeaturedIndex].id)}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white/5 text-white border border-white/10 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-white/10 transition-all active:scale-95"
                >
                  Ver Regras
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 sm:bottom-8 right-1/2 translate-x-1/2 sm:right-16 sm:translate-x-0 z-20 flex gap-2">
          {games.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentFeaturedIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentFeaturedIndex === idx ? "w-8 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Games */}
      <div className="lg:col-span-8 space-y-8">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Biblioteca</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20 animate-pulse">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                {games.length} Jogos
              </span>
            </div>
            <button 
              onClick={() => setShowCreateRoom(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              CRIAR SALA
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {games.map((game) => (
              <GameCard 
                key={game.id}
                title={game.title} 
                description={game.description}
                image={game.image}
                icon={game.icon}
                iconColor={game.color}
                bgColor={game.bg}
                comingSoon={game.comingSoon}
                onLocal={() => {
                  if (game.id === 'Hangman') { 
                    setActiveGame('hangman_local'); 
                    return; 
                  }
                  if (game.id === 'Hangman-Classic') {
                    setActiveGame('hangman_classic_local');
                    return;
                  }
                  if (game.id === 'Snakes-Ladders') {
                    return;
                  }
                  setDifficultyGame(game.id as any);
                  setShowDifficultySelect(true);
                }}
                onCreateRoom={() => {
                  setNewRoomGameType(game.title);
                  setShowCreateRoom(true);
                }}
                onInfo={() => setShowRulesFor(game.id === 'Hangman' ? 'Forca' : game.id)}
              />
            ))}
          </div>
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-bold">Salas Abertas</h2>
            </div>
            <span className="text-[10px] sm:text-xs font-mono opacity-40">{openRooms.length} ATIVAS</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {openRooms.filter((r: any) => (r.participantCount || 0) > 0).length === 0 && (
              <div className="col-span-full py-12 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-sm italic">Nenhuma sala aberta disponível. Crie uma!</p>
              </div>
            )}
            {openRooms.filter((r: any) => (r.participantCount || 0) > 0).map((room: any) => {
              const maxPlayers = GAME_MAX_PLAYERS[room.gameType] || 2;
              const isParticipant = room.creatorId === user?.uid || room.participants?.includes(user?.uid);
              const isFull = (room.participantCount || 0) >= maxPlayers;
              const isPlaying = room.status === 'playing';
              const canJoin = !isFull && !isPlaying && !isParticipant;

              return (
                <div key={room.id} className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-blue-500/50 transition-all gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-base sm:text-lg mb-1 truncate">{room.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold whitespace-nowrap flex items-center gap-1">
                          {room.gameType === 'Tic-Tac-Toe' ? 'Jogo da Velha' : room.gameType}
                          {room.type === 'private' && <Lock className="w-2.5 h-2.5" />}
                        </span>
                        <span className="text-[9px] sm:text-[10px] opacity-40 truncate">por {room.creatorName}</span>
                        {isPlaying && (
                          <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-md uppercase tracking-tighter animate-pulse">Live</span>
                        )}
                        <span className="text-[8px] sm:text-[10px] font-mono opacity-40 ml-auto">
                          {room.participantCount || 0}/{maxPlayers}
                        </span>
                      </div>
                  </div>
                  <div className="flex gap-2">
                    {isParticipant ? (
                      <button 
                        onClick={() => joinRoom(room)}
                        className="px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95 whitespace-nowrap bg-white/10 hover:bg-white/20 text-white"
                      >
                        REENTRAR
                      </button>
                    ) : (
                      canJoin ? (
                        <button 
                          onClick={() => joinRoom(room)}
                          className="px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                          ENTRAR
                        </button>
                      ) : (
                        <button 
                          onClick={() => joinRoom(room, true)}
                          className="px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold bg-purple-600 hover:bg-purple-700 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          ASSISTIR
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-4 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
            <h2 className="text-xl sm:text-2xl font-bold">Global Ranking</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {globalRanking.length === 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-6 h-6 bg-white/10 rounded flex-shrink-0" />
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                        <div className="h-3 bg-white/5 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="w-16 h-8 bg-white/10 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : globalRanking.map((rankUser, i) => (
              <div key={rankUser.uid} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 group gap-2">
                <div 
                  className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onViewUserProfile(rankUser.uid)}
                >
                  <span className="font-mono text-base sm:text-xl opacity-20 flex-shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                  <img 
                    src={rankUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rankUser.uid}`} 
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/10 flex-shrink-0"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="font-bold text-sm sm:text-base truncate">{rankUser.displayName}</p>
                      {rankUser.role === 'admin' && <span className="text-[7px] sm:text-[8px] font-black bg-rose-500 text-white px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-tighter flex-shrink-0">Admin</span>}
                    </div>
                    <p className="text-[10px] sm:text-xs opacity-50 truncate">
                      {rankUser.city ? `${rankUser.city}${rankUser.country ? `, ${rankUser.country}` : ''}` : 'Earth'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-mono font-bold text-blue-400 text-xs sm:text-base">{rankUser.score || 0} PTS</p>
                    <p className="text-[8px] sm:text-[10px] uppercase tracking-widest opacity-30 hidden min-[400px]:block">
                      {i === 0 ? 'Grand Master' : i === 1 ? 'Master' : 'Pro Player'}
                    </p>
                  </div>
                  {user?.uid !== rankUser.uid && (
                    <button 
                      onClick={() => sendFriendRequest(rankUser.uid)}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {bestGame && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent rounded-[32px] p-6 sm:p-8 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                  {bestGame.image ? (
                    <img src={bestGame.image} alt={bestGame.id} className="w-48 h-48 object-contain rotate-12" referrerPolicy="no-referrer" />
                  ) : (
                    <bestGame.icon className="w-32 h-32 rotate-12" />
                  )}
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  <div className={cn("p-2 rounded-[24px] shadow-2xl flex items-center justify-center w-20 h-20 overflow-hidden", bestGame.bg)}>
                    {bestGame.image ? (
                      <img src={bestGame.image} alt={bestGame.id} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <bestGame.icon className={cn("w-10 h-10", bestGame.color)} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-400 mb-1">Seu Melhor Desempenho</h4>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Melhor em {bestGame.id === 'Hangman' ? 'Forca Batalha' : bestGame.id === 'Snakes-Ladders' ? 'Cobras e Escadas' : bestGame.id}</h3>
                    <p className="text-sm opacity-50 font-medium leading-relaxed max-w-sm">
                      Você conquistou {bestGame.wins} vitórias nesta categoria. Continue assim!
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (bestGame.id === 'Tic-Tac-Toe') setDifficultyGame('Tic-Tac-Toe');
                      else if (bestGame.id === 'Checkers') setDifficultyGame('Checkers');
                      else if (bestGame.id === 'Ludo') setDifficultyGame('Ludo');
                      else if (bestGame.id === 'Hangman') { setActiveGame('hangman_local'); return; }
                      setShowDifficultySelect(true);
                    }}
                    className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                    Jogar Novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {mostPlayed && (
            <div className={cn("mt-4", !bestGame && "mt-8 pt-8 border-t border-white/10")}>
              <div className="bg-gradient-to-br from-purple-600/10 via-blue-600/5 to-transparent rounded-[32px] p-6 sm:p-8 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                  {mostPlayed.image ? (
                    <img src={mostPlayed.image} alt={mostPlayed.id} className="w-48 h-48 object-contain rotate-12" referrerPolicy="no-referrer" />
                  ) : (
                    <mostPlayed.icon className="w-32 h-32 rotate-12" />
                  )}
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  <div className={cn("p-2 rounded-[24px] shadow-2xl flex items-center justify-center w-20 h-20 overflow-hidden", mostPlayed.bg)}>
                    {mostPlayed.image ? (
                      <img src={mostPlayed.image} alt={mostPlayed.id} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <mostPlayed.icon className={cn("w-10 h-10", mostPlayed.color)} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-purple-400 mb-1">Jogo Mais Jogado</h4>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Mestre em {mostPlayed.id === 'Hangman' ? 'Forca Batalha' : mostPlayed.id === 'Snakes-Ladders' ? 'Cobras e Escadas' : mostPlayed.id}</h3>
                    <p className="text-sm opacity-50 font-medium leading-relaxed max-w-sm">
                      Você entrou na arena {mostPlayed.total} vezes. Sua dedicação é lendária!
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (mostPlayed.id === 'Tic-Tac-Toe') setDifficultyGame('Tic-Tac-Toe');
                      else if (mostPlayed.id === 'Checkers') setDifficultyGame('Checkers');
                      else if (mostPlayed.id === 'Ludo') setDifficultyGame('Ludo');
                      else if (mostPlayed.id === 'Hangman') { setActiveGame('hangman_local'); return; }
                      setShowDifficultySelect(true);
                    }}
                    className="px-6 py-3 bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all shadow-xl"
                  >
                    Entrar na Arena
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <MatchHistory />

        {(profile?.role === 'admin' || profile?.role === 'moderator') && (
          <section className="bg-white/5 rounded-3xl border border-white/10 p-4 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                <h2 className="text-xl sm:text-2xl font-bold">Painel de Moderação</h2>
                <button 
                  onClick={() => setShowModerationUsers(!showModerationUsers)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                  title={showModerationUsers ? "Ocultar Usuários" : "Mostrar Usuários"}
                >
                  <Eye className={cn("w-4 h-4 transition-colors", showModerationUsers ? "text-rose-500" : "opacity-40 group-hover:opacity-100")} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-600/20"
                >
                  Resetar Todos os Dados
                </button>
                <span className="text-[9px] sm:text-[10px] font-black bg-rose-500/10 text-rose-500 px-2 sm:px-3 py-1 rounded-full border border-rose-500/20 whitespace-nowrap">
                  SOMENTE ADMIN
                </span>
              </div>
            </div>
            
            <AnimatePresence>
              {showResetConfirm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 overflow-hidden"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 text-rose-500">
                      <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Nuclear Option Warning</p>
                        <p className="text-xs opacity-70 mt-1">
                          This will permanently delete all match history and reset every single player's score and statistics to zero. 
                          This action is irreversible.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase opacity-60">Type RESET to confirm</p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={resetInput}
                          onChange={(e) => setResetInput(e.target.value)}
                          placeholder="Type RESET"
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-rose-500/50"
                        />
                        <button 
                          onClick={resetAllMatchData}
                          disabled={resetInput !== 'RESET'}
                          className="px-6 py-2 bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          PROCEED
                        </button>
                        <button 
                          onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                          className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {showModerationUsers && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 sm:space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mt-4"
                >
                  {loadingUsers ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-1/2" />
                            <div className="h-3 bg-white/5 rounded w-1/3" />
                          </div>
                        </div>
                        <div className="w-20 h-8 bg-white/10 rounded-xl" />
                      </div>
                    ))
                  ) : (
                    allUsers.map((u) => (
                      <div key={u.uid} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-rose-500/30 transition-all gap-3">
                        <div 
                          className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => onViewUserProfile(u.uid)}
                        >
                          <div className="relative flex-shrink-0">
                            <img 
                              src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                              className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/10", u.banned && "grayscale opacity-50")}
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            {u.online && <div className="absolute bottom-0 right-0 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className={cn("font-bold text-sm sm:text-base truncate", u.banned && "line-through opacity-50")}>{u.displayName}</p>
                              {u.role === 'admin' && <span className="text-[7px] sm:text-[8px] font-black bg-rose-500 text-white px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-tighter flex-shrink-0">Admin</span>}
                              {u.banned && <span className="text-[7px] sm:text-[8px] font-black bg-black text-rose-500 px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-tighter border border-rose-500/50 flex-shrink-0">Banned</span>}
                            </div>
                            <p className="text-[9px] sm:text-[10px] opacity-40 truncate">{u.email}</p>
                          </div>
                        </div>
                        
                        {u.uid !== user?.uid && u.role !== 'admin' && (
                          <button 
                            onClick={() => setUserToToggleBan(u)}
                            className={cn(
                              "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0",
                              u.banned 
                                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" 
                                : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            )}
                          >
                            {u.banned ? (
                              <><CheckCircle className="w-3 h-3" /> <span className="hidden min-[400px]:inline">Unban</span></>
                            ) : (
                              <><Ban className="w-3 h-3" /> <span className="hidden min-[400px]:inline">Ban User</span><span className="min-[400px]:hidden">Ban</span></>
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* Right Column: Social */}
      <div className="lg:col-span-4 space-y-8">
        <AnimatePresence>
          {inviteStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 right-6 z-[100] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
            >
              <Bell className="w-5 h-5" />
              {inviteStatus}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCreateRoom && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full shadow-2xl"
              >
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-center">Criar Sala</h2>
                <p className="text-sm opacity-60 mb-8 text-center">Inicie uma nova sessão de jogo.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2 block">Nome da Sala</label>
                    <input 
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. Pro Players Only"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2 block">Select Game</label>
                    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {games.filter(g => !g.comingSoon).map((game) => (
                        <button 
                          key={game.id}
                          onClick={() => setNewRoomGameType(game.title)}
                          className={cn(
                            "py-3 px-3 rounded-2xl font-bold text-[10px] sm:text-xs border transition-all flex items-center gap-2",
                            newRoomGameType === game.title ? "bg-white/10 border-white/30 ring-1 ring-white/20 shadow-lg shadow-black/20" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100 hover:bg-white/10"
                          )}
                        >
                          <img src={game.image} className="w-5 h-5 object-contain" aria-hidden="true" referrerPolicy="no-referrer" />
                          <span className="truncate">{game.title === 'Tic-Tac-Toe' ? 'Jogo da Velha' : game.title === 'Checkers' ? 'Damas' : game.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2 block">Privacidade</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setNewRoomType('open')}
                        className={cn(
                          "py-3 rounded-2xl font-bold text-sm border transition-all",
                          newRoomType === 'open' ? "bg-blue-600 border-blue-500" : "bg-white/5 border-white/10 opacity-40"
                        )}
                      >
                        Pública
                      </button>
                      <button 
                        onClick={() => setNewRoomType('private')}
                        className={cn(
                          "py-3 rounded-2xl font-bold text-sm border transition-all",
                          newRoomType === 'private' ? "bg-blue-600 border-blue-500" : "bg-white/5 border-white/10 opacity-40"
                        )}
                      >
                        Privada
                      </button>
                    </div>
                    <p className="text-[10px] opacity-30 mt-2 italic">
                      {newRoomType === 'open' ? 'Listada no lobby público.' : 'Acessível apenas via convite direto.'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={createRoom}
                      disabled={!newRoomName.trim()}
                      className="w-full py-4 bg-blue-600 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Criar Sessão
                    </button>
                    <button 
                      onClick={() => setShowCreateRoom(false)}
                      className="text-xs uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {invitingFriend && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl"
              >
                <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-6">
                  <Grid3X3 className="w-12 h-12 text-blue-400" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Invite {invitingFriend.displayName}</h2>
                <p className="text-sm opacity-60 mb-8">Choose a game to play together.</p>
                
                <div className="flex flex-col gap-3">
                  {[
                    { id: 'Tic-Tac-Toe', icon: Grid3X3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { id: 'Checkers', icon: Disc, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { id: 'Ludo', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                    { id: 'Forca Batalha', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { id: 'Forca Clássico', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' }
                  ].map((game) => (
                    <button
                      key={game.id}
                      onClick={() => sendGameInvite(invitingFriend, game.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl font-bold text-lg transition-all border",
                        `${game.bg} border-white/10 hover:border-white/20`
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <game.icon className={cn("w-6 h-6", game.color)} />
                        <span>
                          {game.id === 'Tic-Tac-Toe' ? 'Jogo da Velha' : 
                          game.id === 'Checkers' ? 'Damas' : 
                          game.id === 'Forca Batalha' ? 'Forca Batalha' : 
                          game.id === 'Forca Clássico' ? 'Forca Clássico' : 
                          game.id}
                        </span>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => setInvitingFriend(null)}
                    className="mt-4 text-xs uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {invite && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-24 right-6 z-[120] bg-blue-600 p-6 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-4 w-80"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl animate-bounce">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">Game Invite!</p>
                  <p className="text-xs opacity-80">{invite.fromUser.displayName} wants to play {invite.gameType}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={acceptInvite}
                  disabled={invite.accepting}
                  className="flex-1 bg-white text-blue-600 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  {invite.accepting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : 'Accept'}
                </button>
                <button 
                  onClick={declineInvite}
                  disabled={invite.accepting}
                  className="flex-1 bg-black/20 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50 hover:bg-black/30 transition-colors"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Chat 
          socket={socket} 
          activeRoom={activeRoom} 
          onBack={activeRoom.id !== 'global' ? () => setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }) : undefined}
        />
        
        <section className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              Friend Requests
            </h3>
            {pendingRequests.length > 0 && (
              <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                {pendingRequests.length} NEW
              </span>
            )}
          </div>
          <div className="space-y-3">
            {pendingRequests.length === 0 && (
              <p className="text-xs opacity-30 italic py-2">No incoming requests</p>
            )}
             {pendingRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onViewUserProfile(req.sender?.uid)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                    <img 
                      src={req.sender?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender?.uid}`} 
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[120px]">{req.sender?.displayName || 'User'}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => acceptFriendRequest(req.id)}
                    className="p-1.5 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-colors"
                    title="Accept"
                  >
                    <Users className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  <button 
                    onClick={() => rejectFriendRequest(req.id)}
                    className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {sentRequests.length > 0 && (
            <div className="mt-8">
              <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-3 font-bold">Sent Requests</h4>
              <div className="space-y-2">
                {sentRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <img 
                        src={req.receiver?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.receiver?.uid}`} 
                        className="w-6 h-6 rounded-full opacity-60"
                        alt=""
                      />
                      <span className="text-xs opacity-60 truncate max-w-[100px]">{req.receiver?.displayName}</span>
                    </div>
                    <button 
                      onClick={() => cancelFriendRequest(req.id)}
                      className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
                      title="Cancel Request"
                    >
                      <X className="w-3 h-3 text-rose-400/50 hover:text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              Friends
            </h3>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              {friends.length} TOTAL
            </span>
          </div>
          <div className="space-y-3">
            {friends.length === 0 && (
              <p className="text-xs opacity-30 italic py-2">No friends yet</p>
            )}
            {friends.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between group">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onViewUserProfile(f.friend?.uid)}
                >
                  <div className="relative">
                    <img 
                      src={f.friend?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.friend?.uid}`} 
                      className="w-8 h-8 rounded-full bg-white/10"
                      alt=""
                    />
                    <div className={cn(
                      "absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full",
                      f.friend?.online ? "bg-green-500" : "bg-gray-500"
                    )} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium">{f.friend?.displayName}</span>
                    {activeRoom.id === 'global' && privateChatPreviews[[user.uid, f.friend?.uid].sort().join('_')] && (
                      <p className="text-[10px] opacity-40 truncate max-w-[120px] sm:max-w-[150px]">
                        {privateChatPreviews[[user.uid, f.friend?.uid].sort().join('_')].senderId === user.uid ? 'You: ' : ''}
                        {privateChatPreviews[[user.uid, f.friend?.uid].sort().join('_')].text}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 transition-all md:opacity-0 md:group-hover:opacity-100">
                  <button 
                    onClick={() => openPrivateChat(f.friend)}
                    className="p-1.5 hover:bg-white/10 rounded-lg"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </button>
                  <button 
                    onClick={() => setInvitingFriend(f.friend)}
                    className="p-1.5 hover:bg-white/10 rounded-lg"
                  >
                    <Grid3X3 className="w-4 h-4 text-green-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <Search className="w-4 h-4" />
              Find Players
            </h3>
          </div>
          <form onSubmit={handleSearch} className="relative mb-4">
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
            />
            <button type="submit" className="absolute right-2 top-1.5 p-1 hover:bg-white/10 rounded-lg">
              <Search className="w-4 h-4 opacity-40" />
            </button>
          </form>
          
          <div className="space-y-3">
            {isSearching && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onViewUserProfile(u.uid)}
                    >
                      <img 
                        src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                        className="w-8 h-8 rounded-full"
                        alt=""
                      />
                      <span className="text-sm font-medium truncate max-w-[100px]">{u.displayName}</span>
                    </div>
                    <button 
                      onClick={() => {
                        sendFriendRequest(u.uid);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                      className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-all"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <p className="text-[10px] opacity-30 text-center italic">No players found</p>
            )}
          </div>
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Suggested Friends
            </h3>
          </div>
          <div className="space-y-4">
            {loadingSuggestions ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl" />)}
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-xs opacity-30 italic py-2 text-center">No suggestions right now</p>
            ) : (
              suggestions.map((u) => (
                <div key={u.uid} className="flex items-center justify-between group">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onViewUserProfile(u.uid)}
                  >
                    <div className="relative">
                      <img 
                        src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                        className="w-8 h-8 rounded-full bg-white/10"
                        alt=""
                      />
                      {u.online && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-slate-900 rounded-full" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.displayName}</p>
                      <p className="text-[10px] opacity-40">
                        {u.city ? `${u.city}${u.country ? `, ${u.country}` : ''}` : 'Active player'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendFriendRequest(u.uid)}
                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
      {/* Ban Confirmation Modal */}
      <AnimatePresence>
        {userToToggleBan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                  userToToggleBan.banned ? "bg-green-500/10" : "bg-rose-500/10"
                )}>
                  {userToToggleBan.banned ? <UserCheck className="w-8 h-8 text-green-500" /> : <Ban className="w-8 h-8 text-rose-500" />}
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">
                  {userToToggleBan.banned ? 'Unban User?' : 'Ban User?'}
                </h3>
                <p className="text-sm opacity-50 mb-8">
                  {userToToggleBan.banned 
                    ? `Are you sure you want to restore access for ${userToToggleBan.displayName}?`
                    : `Are you sure you want to suspend ${userToToggleBan.displayName}? They will be immediately disconnected.`
                  }
                </p>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setUserToToggleBan(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={toggleBan}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-colors",
                      userToToggleBan.banned ? "bg-green-600 hover:bg-green-500" : "bg-rose-600 hover:bg-rose-500"
                    )}
                  >
                    {userToToggleBan.banned ? 'Unban' : 'Ban'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Game Rules Modal */}
      <AnimatePresence>
        {showRulesFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowRulesFor(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 opacity-40" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-yellow-500/10 rounded-2xl">
                  <HelpCircle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                    {showRulesFor === 'Tic-Tac-Toe' ? 'Jogo da Velha' : 
                     showRulesFor === 'Checkers' ? 'Damas' : 
                     showRulesFor} Rules
                  </h3>
                  <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">Learn how to play</p>
                </div>
              </div>

              <div className="space-y-6">
                {showRulesFor === 'Tic-Tac-Toe' ? (
                  <>
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
                        <p className="text-sm opacity-60">If all 9 squares are filled and no one has three in a row, the game is a draw. You can request a rematch immediately after!</p>
                      </div>
                    </div>
                  </>
                ) : showRulesFor === 'Checkers' ? (
                  <>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                      <div>
                        <h4 className="font-bold mb-1">Movement</h4>
                        <p className="text-sm opacity-60">Move your pieces diagonally forward to dark squares. You can only move one square at a time unless capturing.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-rose-400">2</div>
                      <div>
                        <h4 className="font-bold mb-1">Capturing</h4>
                        <p className="text-sm opacity-60">Capture opponent pieces by jumping over them to an empty square. Multiple jumps are allowed in one turn!</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-purple-400">3</div>
                      <div>
                        <h4 className="font-bold mb-1">Becoming a King</h4>
                        <p className="text-sm opacity-60">Reach the opponent's back row to become a King. Kings can move and capture both forwards and backwards!</p>
                      </div>
                    </div>
                  </>
                ) : showRulesFor === 'Ludo' ? (
                  <>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                      <div>
                        <h4 className="font-bold mb-1">Início</h4>
                        <p className="text-sm opacity-60">Você precisa tirar um 6 no dado para tirar uma peça da base.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-rose-400">2</div>
                      <div>
                        <h4 className="font-bold mb-1">Captura</h4>
                        <p className="text-sm opacity-60">Cair na mesma casa de um oponente envia a peça dele de volta para a base!</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-green-500">3</div>
                      <div>
                        <h4 className="font-bold mb-1">Vitória</h4>
                        <p className="text-sm opacity-60">Leve todas as suas 4 peças para o triângulo central da sua cor para vencer.</p>
                      </div>
                    </div>
                  </>
                ) : showRulesFor === 'Forca Batalha' ? (
                  <>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                      <div>
                        <h4 className="font-bold mb-1">Modo Local</h4>
                        <p className="text-sm opacity-60">Adivinhe a palavra letra por letra. Cada erro adiciona uma parte ao boneco. Não deixe ele ser completado!</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-purple-400">2</div>
                      <div>
                        <h4 className="font-bold mb-1">Modo Online</h4>
                        <p className="text-sm opacity-60">Duelos 1x1 onde cada um define uma palavra. Quem pontuar mais nos dois rounds vence.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-12 opacity-40 italic">Rules for this game will be available soon.</p>
                )}
              </div>

              <button
                onClick={() => setShowRulesFor(null)}
                className="w-full mt-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all active:scale-95"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {joiningRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-6 text-blue-400">
                <Key className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Private Room</h2>
              <p className="text-sm opacity-60 mb-8">Enter the 6-digit access code to join <b>{joiningRoom.name}</b>.</p>
              
              <div className="space-y-4">
                <div>
                  <input 
                    type="text"
                    maxLength={6}
                    value={entryCode}
                    onChange={(e) => {
                      setEntryCode(e.target.value.replace(/\D/g, ''));
                      setCodeError(null);
                    }}
                    autoFocus
                    placeholder="Enter 6-digit code"
                    className={cn(
                      "w-full bg-white/5 border rounded-2xl px-6 py-5 text-center text-3xl font-mono font-bold tracking-[0.5em] focus:outline-none transition-all",
                      codeError ? "border-rose-500 text-rose-500" : "border-white/10 focus:border-blue-500"
                    )}
                  />
                  {codeError && <p className="text-xs text-rose-500 mt-2 font-bold">{codeError}</p>}
                </div>
                
                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={verifyAndJoin}
                    disabled={entryCode.length !== 6}
                    className="w-full py-4 bg-blue-600 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Join Match
                  </button>
                  <button 
                    onClick={() => setJoiningRoom(null)}
                    className="text-xs uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
