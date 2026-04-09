import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, MessageSquare, Gamepad2, LogOut, User as UserIcon, Settings, Bell, Search, Send, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, signOut, db, collection, query, where, getDoc, setDoc, updateDoc, doc, orderBy, limit, onSnapshot, addDoc, serverTimestamp, OperationType, handleFirestoreError, signInWithPopup, googleProvider, getDocs, startAfter } from './firebase';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useError } from './ErrorContext';
import { io, Socket } from 'socket.io-client';
import { cn } from './lib/utils';

// --- Components ---

const NotificationToast = ({ notification, onClose }: { notification: any, onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="fixed bottom-6 right-6 z-[100] w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex gap-4 items-start"
  >
    <div className="p-2 bg-blue-600/20 rounded-xl">
      <MessageSquare className="w-5 h-5 text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400">{notification.roomName}</p>
        <button onClick={onClose} className="opacity-30 hover:opacity-100 p-1">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full rotate-45" />
        </button>
      </div>
      <p className="text-sm font-bold truncate">{notification.senderName}</p>
      <p className="text-sm opacity-60 line-clamp-2">{notification.text}</p>
    </div>
  </motion.div>
);

const Navbar = ({ onViewProfile, onViewDashboard, pendingRequestsCount }: { onViewProfile: () => void, onViewDashboard: () => void, pendingRequestsCount: number }) => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b backdrop-blur-md",
      theme === 'cyberpunk' ? "border-yellow-400/30 bg-black/80" :
      theme === 'forest' ? "border-emerald-500/30 bg-emerald-950/80" :
      "border-white/10 bg-slate-900/80"
    )}>
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onClick={onViewDashboard}
      >
        <Gamepad2 className="w-8 h-8 text-blue-400 group-hover:rotate-12 transition-transform" />
        <span className="text-2xl font-bold tracking-tighter italic">GAMELAND</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-mono">{profile?.score || 0} PTS</span>
        </div>

        <button 
          onClick={onViewDashboard}
          className="relative p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <Users className="w-5 h-5 text-white/70 group-hover:text-white" />
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onViewProfile}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{profile?.displayName}</p>
              <p className="text-xs opacity-50">{profile?.city || 'Earth'}</p>
            </div>
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-blue-500 group-hover:scale-110 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const MatchHistory = () => {
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
              <span className="text-xs opacity-50">Page {page}</span>
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

const ProfileView = ({ onBack }: { onBack: () => void }) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile?.displayName || '',
    city: profile?.city || '',
    state: profile?.state || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || '',
        city: profile.city || '',
        state: profile.state || ''
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editForm.displayName,
        city: editForm.city,
        state: editForm.state
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, showError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-24 px-6 pb-12 max-w-4xl mx-auto">
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm opacity-50 hover:opacity-100 transition-opacity"
      >
        <Search className="w-4 h-4 rotate-180" /> Back to Dashboard
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 rounded-[40px] border border-white/10 p-12 overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20" />
        
        <div className="relative flex flex-col items-center text-center">
          <div className="relative group">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
              alt="Profile" 
              className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-2xl mb-6"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="absolute bottom-6 right-0 p-2 bg-blue-600 rounded-full border-2 border-slate-900 shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="w-full max-w-md space-y-4 mb-8">
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest opacity-40 ml-2">Display Name</label>
                <input 
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Your Name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase tracking-widest opacity-40 ml-2">City</label>
                  <input 
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase tracking-widest opacity-40 ml-2">State</label>
                  <input 
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 bg-white/5 py-3 rounded-2xl font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic">{profile?.displayName}</h2>
              <p className="text-lg opacity-60 mb-8">{profile?.city}, {profile?.state}</p>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold">{profile?.score || 0}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-40">Total Points</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <Gamepad2 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold">12</p>
              <p className="text-[10px] uppercase tracking-widest opacity-40">Games Played</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold">8</p>
              <p className="text-[10px] uppercase tracking-widest opacity-40">Friends</p>
            </div>
          </div>

          <div className="mt-12 w-full text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-30 mb-4 px-2">Account Details</h3>
            <div className="bg-white/5 rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-sm opacity-50">Email</span>
                <span className="text-sm font-medium">{profile?.email}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-sm opacity-50">Member Since</span>
                <span className="text-sm font-medium">April 2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-50">Status</span>
                <span className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
                </span>
              </div>
            </div>
          </div>

          <MatchHistory />
        </div>
      </motion.div>
    </div>
  );
};

const Chat = ({ socket, activeRoom, onBack }: { socket: Socket | null, activeRoom: { id: string, name: string, isPrivate: boolean, friendId?: string }, onBack?: () => void }) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [friendStatus, setFriendStatus] = useState<any>(null);

  const formatMessageDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Offline';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  };

  useEffect(() => {
    if (activeRoom.isPrivate && activeRoom.friendId) {
      const unsubscribe = onSnapshot(doc(db, 'users', activeRoom.friendId), (doc) => {
        setFriendStatus(doc.data());
      });
      return () => unsubscribe();
    } else {
      setFriendStatus(null);
    }
  }, [activeRoom.id, activeRoom.friendId, activeRoom.isPrivate]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'), 
      where('roomId', '==', activeRoom.id),
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages', showError));

    return () => unsubscribe();
  }, [activeRoom.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: profile?.displayName || 'Anonymous',
        text: input,
        createdAt: serverTimestamp(),
        roomId: activeRoom.id,
        participants: activeRoom.isPrivate ? [user.uid, activeRoom.friendId] : ['global']
      });
      setInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages', showError);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {activeRoom.isPrivate ? (
              <>
                <img 
                  src={friendStatus?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRoom.friendId}`} 
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/10"
                  alt=""
                />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-slate-900 rounded-full",
                  friendStatus?.online ? "bg-green-500" : "bg-gray-500"
                )} />
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold uppercase text-[10px] tracking-widest leading-none mb-1">
              {activeRoom.isPrivate && friendStatus ? friendStatus.displayName : activeRoom.name}
            </h3>
            {activeRoom.isPrivate && (
              <p className="text-[9px] opacity-40 uppercase tracking-tighter flex items-center gap-1">
                {friendStatus?.online ? (
                  <>
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    Online Now
                  </>
                ) : (
                  <>
                    <span className="w-1 h-1 bg-gray-500 rounded-full" />
                    {formatLastSeen(friendStatus?.lastSeen)}
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100">
            Global Chat
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center opacity-20 text-xs italic">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, index) => {
          const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
          const prevMsg = messages[index - 1];
          const prevMsgDate = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : null;
          const showDateSeparator = !prevMsgDate || formatMessageDate(msgDate) !== formatMessageDate(prevMsgDate);

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[9px] uppercase tracking-[0.2em] opacity-20 font-bold">
                    {formatMessageDate(msgDate)}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              )}
              <div className={cn(
                "flex flex-col max-w-[80%]",
                msg.senderId === user?.uid ? "ml-auto items-end" : "items-start"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-50">{msg.senderName}</span>
                  <span className="text-[9px] opacity-20 font-mono">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                </div>
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm shadow-sm",
                  msg.senderId === user?.uid ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/10 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

const GameCard = ({ title, description, icon: Icon, color, onClick }: any) => (
  <motion.div 
    whileHover="hover"
    onClick={onClick}
    className="relative group cursor-pointer overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col items-center text-center gap-4 transition-all hover:border-white/20"
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
      className={cn("p-6 rounded-2xl bg-opacity-10 transition-colors", color)}
    >
      <Icon className={cn("w-12 h-12", color.replace('bg-', 'text-'))} />
    </motion.div>
    <div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm opacity-60">{description}</p>
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.div>
);

type Difficulty = 'Easy' | 'Medium' | 'Hard';

const TicTacToe = ({ vsCPU, difficulty = 'Easy', online, socket, roomId, friendId, onBack }: { vsCPU?: boolean, difficulty?: Difficulty, online?: boolean, socket?: Socket | null, roomId?: string, friendId?: string, onBack: () => void }) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);

  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  useEffect(() => {
    if (online && friendId) {
      const fetchOpponent = async () => {
        try {
          const docRef = doc(db, 'users', friendId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setOpponent(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching opponent profile:", error);
        }
      };
      fetchOpponent();
    }
  }, [online, friendId]);

  useEffect(() => {
    if (online && socket && roomId) {
      socket.emit('join_room', roomId);
      
      // Determine symbol based on roomId sort order (first user is X)
      const [id1] = roomId.replace('game_', '').split('_');
      setPlayerSymbol(user?.uid === id1 ? 'X' : 'O');

      socket.on('receive_move', (move: any) => {
        setBoard(prev => {
          const next = [...prev];
          next[move.index] = move.symbol;
          return next;
        });
        setIsXNext(move.symbol === 'O');
      });

      return () => {
        socket.off('receive_move');
      };
    }
  }, [online, socket, roomId, user]);

  const checkWinner = (squares: (string | null)[]) => {
    for (let i = 0; i < winningLines.length; i++) {
      const [a, b, c] = winningLines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every(s => s) ? 'Draw' : null;
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
        if (move !== -1) handleClick(move);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, vsCPU, winner, board, difficulty]);

  useEffect(() => {
    const w = checkWinner(board);
    if (w) {
      setWinner(w);
      saveMatch(w);
    }
  }, [board]);

  const saveMatch = async (result: string) => {
    if (!user) return;
    
    if (online && playerSymbol !== 'X') return;

    try {
      await addDoc(collection(db, 'matches'), {
        players: online ? roomId?.replace('game_', '').split('_') : [user.uid, 'CPU'],
        vsCPU: !!vsCPU,
        gameType: 'Tic-Tac-Toe',
        difficulty: vsCPU ? difficulty : null,
        winner: result === 'Draw' ? 'Draw' : (result === 'X' ? 'X' : 'O'),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches', showError);
    }
  };

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    
    if (online) {
      const currentSymbol = isXNext ? 'X' : 'O';
      if (currentSymbol !== playerSymbol) return;
      
      socket?.emit('make_move', { roomId, move: { index: i, symbol: playerSymbol } });
    }

    const newBoard = [...board];
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  return (
    <div className="flex flex-col items-center gap-8 pt-32 pb-12">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-2">Tic-Tac-Toe</h2>
        <p className="opacity-60">
          {online ? `Online Match (${playerSymbol})` : vsCPU ? `vs Computer (${difficulty})` : 'Local Multiplayer'}
        </p>
        
        <div className="mt-6 flex items-center justify-center gap-8">
          <div className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
            isXNext ? "bg-blue-500/20 ring-2 ring-blue-500/50" : "opacity-40"
          )}>
            <div className="relative">
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                className="w-12 h-12 rounded-full border-2 border-blue-500"
                alt="Me"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">X</div>
            </div>
            <span className="text-xs font-bold truncate max-w-[80px]">{profile?.displayName || 'Me'}</span>
          </div>

          <div className="text-2xl font-black opacity-20 italic">VS</div>

          <div className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
            !isXNext ? "bg-rose-500/20 ring-2 ring-rose-500/50" : "opacity-40"
          )}>
            <div className="relative">
              {vsCPU ? (
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-rose-500">
                  <Gamepad2 className="w-6 h-6 text-rose-500" />
                </div>
              ) : (
                <img 
                  src={opponent?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`} 
                  className="w-12 h-12 rounded-full border-2 border-rose-500"
                  alt="Opponent"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">O</div>
            </div>
            <span className="text-xs font-bold truncate max-w-[80px]">{vsCPU ? 'CPU' : (opponent?.displayName || 'Opponent')}</span>
          </div>
        </div>

        {online && !winner && (
          <p className={cn(
            "mt-4 font-bold text-sm uppercase tracking-widest",
            (isXNext ? 'X' : 'O') === playerSymbol ? "text-green-400" : "text-white/40"
          )}>
            {(isXNext ? 'X' : 'O') === playerSymbol ? "Your Turn" : "Opponent's Turn"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
        {board.map((square, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={online && (isXNext ? 'X' : 'O') !== playerSymbol}
            className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 text-4xl font-bold flex items-center justify-center hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
          >
            <span className={cn(
              square === 'X' ? "text-blue-400" : "text-rose-400"
            )}>{square}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h3 className="text-2xl font-bold mb-4">
              {winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}
            </h3>
            <div className="flex gap-4">
              {!online && (
                <button 
                  onClick={() => { setBoard(Array(9).fill(null)); setWinner(null); setIsXNext(true); }}
                  className="px-6 py-2 bg-blue-600 rounded-full font-bold"
                >
                  Play Again
                </button>
              )}
              <button 
                onClick={onBack}
                className="px-6 py-2 bg-white/10 rounded-full font-bold"
              >
                {online ? 'Back to Dashboard' : 'Exit'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const Dashboard = ({ activeRoom, setActiveRoom, pendingRequests, friends }: any) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [cpuDifficulty, setCpuDifficulty] = useState<Difficulty>('Easy');
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    const s = io();
    setSocket(s);
    if (user) {
      s.emit('user_online', { uid: user.uid, displayName: profile?.displayName });
    }

    s.on('receive_game_invite', (data) => {
      if (data.toUserId === user?.uid) {
        setInvite(data);
        // Play subtle notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(err => console.log('Audio playback prevented:', err));
      }
    });

    s.on('match_started', (data) => {
      if (data.fromUserId === user?.uid || data.toUserId === user?.uid) {
        const opponentId = data.fromUserId === user?.uid ? data.toUserId : data.fromUserId;
        setActiveRoom({ id: data.roomId, name: 'Game Match', isPrivate: true, friendId: opponentId });
        setActiveGame('tictactoe_online');
        setInvite(null);
      }
    });

    return () => { s.disconnect(); };
  }, [user, profile]);

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    const friendshipId = [user.uid, targetUserId].sort().join('_');
    try {
      await setDoc(doc(db, 'friendships', friendshipId), {
        users: [user.uid, targetUserId],
        senderId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Friend request sent!');
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

  const acceptInvite = () => {
    if (!socket || !user || !invite) return;
    const roomId = `game_${[invite.fromUser.uid, user.uid].sort().join('_')}`;
    
    // Optimistic UI feedback
    setInvite(prev => prev ? { ...prev, accepting: true } : null);
    
    socket.emit('accept_invite', { 
      roomId, 
      fromUserId: invite.fromUser.uid, 
      toUserId: user.uid 
    });
  };

  const sendGameInvite = (friend: any) => {
    if (!socket || !user) return;
    socket.emit('send_game_invite', {
      toUserId: friend.uid,
      fromUser: { uid: user.uid, displayName: profile?.displayName },
      gameType: 'Tic-Tac-Toe'
    });
    alert(`Invite sent to ${friend.displayName}!`);
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
          createdAt: serverTimestamp()
        });
      }
      setActiveRoom({ id: roomId, name: friend.displayName, isPrivate: true, friendId: friend.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`, showError);
    }
  };

  if (activeGame === 'tictactoe_cpu') return <TicTacToe vsCPU difficulty={cpuDifficulty} onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tictactoe_local') return <TicTacToe onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tictactoe_online') return <TicTacToe online socket={socket} roomId={activeRoom.id} friendId={activeRoom.friendId} onBack={() => setActiveGame(null)} />;

  return (
    <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto relative">
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
                <Gamepad2 className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Select Difficulty</h2>
              <p className="text-sm opacity-60 mb-8">Challenge the CPU at your preferred skill level.</p>
              
              <div className="flex flex-col gap-3">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setCpuDifficulty(level);
                      setActiveGame('tictactoe_cpu');
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
                ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Games */}
      <div className="lg:col-span-8 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Available Games</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">LIVE</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs font-bold border border-white/10">2 GAMES</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GameCard 
              title="Tic-Tac-Toe" 
              description="Play against the CPU or a friend locally."
              icon={Gamepad2}
              color="bg-blue-500"
              onClick={() => setShowDifficultySelect(true)}
            />
            <GameCard 
              title="Checkers" 
              description="Classic 8x8 checkers game. (Coming Soon)"
              icon={Trophy}
              color="bg-rose-500"
              onClick={() => {}}
            />
          </div>
        </section>

        <section className="bg-white/5 rounded-3xl border border-white/10 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold">Global Ranking</h2>
          </div>
          <div className="space-y-4">
            {[
              { uid: 'mock_rank_1', displayName: 'ProPlayer_1', city: 'São Paulo, SP', score: 2500 },
              { uid: 'mock_rank_2', displayName: 'ProPlayer_2', city: 'Rio de Janeiro, RJ', score: 2300 },
              { uid: 'mock_rank_3', displayName: 'ProPlayer_3', city: 'Curitiba, PR', score: 2100 }
            ].map((rankUser, i) => (
              <div key={rankUser.uid} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xl opacity-20">0{i + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                  <div>
                    <p className="font-bold">{rankUser.displayName}</p>
                    <p className="text-xs opacity-50">{rankUser.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-mono font-bold text-blue-400">{rankUser.score} PTS</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-30">Master Rank</p>
                  </div>
                  {user?.uid !== rankUser.uid && (
                    <button 
                      onClick={() => sendFriendRequest(rankUser.uid)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
                    >
                      <Users className="w-5 h-5 text-blue-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column: Social */}
      <div className="lg:col-span-4 space-y-8">
        <AnimatePresence>
          {invite && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-blue-600 p-4 rounded-2xl shadow-xl border border-white/20 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 animate-bounce" />
                <p className="text-sm font-bold">Game Invite from {invite.fromUser.displayName}!</p>
              </div>
              <p className="text-xs opacity-80">Wants to play {invite.gameType}</p>
              <div className="flex gap-2">
                <button 
                  onClick={acceptInvite}
                  disabled={invite.accepting}
                  className="flex-1 bg-white text-blue-600 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {invite.accepting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : 'Accept'}
                </button>
                <button 
                  onClick={() => setInvite(null)}
                  disabled={invite.accepting}
                  className="flex-1 bg-black/20 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
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
          onBack={activeRoom.isPrivate ? () => setActiveRoom({ id: 'global', name: 'Global Chat', isPrivate: false }) : undefined}
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
              <p className="text-xs opacity-30 italic py-2">No pending requests</p>
            )}
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium">{req.sender?.displayName || 'User'}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => acceptFriendRequest(req.id)}
                    className="p-1.5 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  <button 
                    onClick={() => rejectFriendRequest(req.id)}
                    className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400 rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
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
                  <span className="text-sm font-medium">{f.friend?.displayName}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => openPrivateChat(f.friend)}
                    className="p-1.5 hover:bg-white/10 rounded-lg"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </button>
                  <button 
                    onClick={() => sendGameInvite(f.friend)}
                    className="p-1.5 hover:bg-white/10 rounded-lg"
                  >
                    <Gamepad2 className="w-4 h-4 text-green-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);
};

const Login = () => {
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
        <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-8">
          <Gamepad2 className="w-12 h-12 text-blue-400" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter italic mb-4">GAMELAND</h1>
        <p className="text-lg opacity-60 mb-12">The ultimate social gaming portal. Compete, chat, and climb the ranks.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full py-4 px-8 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-xs opacity-30 uppercase tracking-widest">Join 10,000+ players worldwide</p>
      </motion.div>
    </div>
  );
};

export default function GameLand() {
  const { user, loading } = useAuth();
  const { showError } = useError();
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');
  const [activeRoom, setActiveRoom] = useState<{ id: string, name: string, isPrivate: boolean, friendId?: string }>({ 
    id: 'global', 
    name: 'Global Chat', 
    isPrivate: false 
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const lastGlobalMessageId = useRef<string | null>(null);
  const lastPrivateMessageId = useRef<string | null>(null);
  const lastRequestId = useRef<string | null>(null);
  const isInitialGlobalMsg = useRef(true);
  const isInitialPrivateMsg = useRef(true);
  const isInitialReq = useRef(true);

  useEffect(() => {
    if (!user) return;

    // Set online status
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { 
      online: true,
      lastSeen: serverTimestamp() 
    }).catch(err => console.error("Error updating status:", err));

    const handleDisconnect = () => {
      // Note: This is best-effort in a browser environment
      updateDoc(userRef, { 
        online: false,
        lastSeen: serverTimestamp() 
      });
    };

    window.addEventListener('beforeunload', handleDisconnect);

    // Listen for friend requests
    const qRequests = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeRequests = onSnapshot(qRequests, async (snapshot) => {
      const incoming = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((f: any) => f.senderId !== user.uid);
      
      // Fetch sender details for each request
      const enriched = await Promise.all(incoming.map(async (req: any) => {
        const senderId = req.users.find((id: string) => id !== user.uid);
        const senderDoc = await getDoc(doc(db, 'users', senderId));
        return { ...req, sender: senderDoc.data() };
      }));
      
      setPendingRequests(enriched);

      // Notification for NEW requests
      if (snapshot.docs.length > 0) {
        const latestDoc = snapshot.docs[0];
        if (isInitialReq.current) {
          lastRequestId.current = latestDoc.id;
          isInitialReq.current = false;
        } else if (latestDoc.id !== lastRequestId.current && (latestDoc.data() as any).senderId !== user.uid) {
          lastRequestId.current = latestDoc.id;
          const reqData = latestDoc.data() as any;
          
          // Show notification
          const senderDoc = await getDoc(doc(db, 'users', reqData.senderId));
          const sender = senderDoc.data();

          const newNotif = {
            id: latestDoc.id,
            senderName: sender?.displayName || 'Someone',
            text: 'sent you a friend request!',
            roomName: 'Social',
            type: 'friend_request'
          };
          setNotifications(prev => [...prev, newNotif]);
          
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.4;
          audio.play().catch(() => {});

          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
          }, 5000);
        }
      }
    });

    // Listen for accepted friends
    const qFriends = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', user.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(qFriends, async (snapshot) => {
      const friendDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const enriched = await Promise.all(friendDocs.map(async (f: any) => {
        const friendId = f.users.find((id: string) => id !== user.uid);
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        return { ...f, friend: friendDoc.data() };
      }));
      setFriends(enriched);
    });

    // Listen for ALL messages to show notifications
    const handleNewMessage = async (snapshot: any, isGlobal: boolean) => {
      if (snapshot.empty) return;
      
      const doc = snapshot.docs[0];
      const msg = doc.data();
      
      // Use separate refs for global and private to avoid cross-talk
      const lastIdRef = isGlobal ? lastGlobalMessageId : lastPrivateMessageId;
      const isInitialRef = isGlobal ? isInitialGlobalMsg : isInitialPrivateMsg;

      if (isInitialRef.current) {
        lastIdRef.current = doc.id;
        isInitialRef.current = false;
        return;
      }

      if (doc.id === lastIdRef.current || msg.senderId === user.uid) return;
      lastIdRef.current = doc.id;

      const isCurrentRoom = view === 'dashboard' && msg.roomId === activeRoom.id;
      
      if (isCurrentRoom) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      } else {
        const newNotif = {
          id: doc.id,
          senderName: msg.senderName,
          text: msg.text,
          roomId: msg.roomId,
          roomName: isGlobal ? 'Global Chat' : 'Private Message',
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
    };

    const qGlobal = query(
      collection(db, 'messages'),
      where('roomId', '==', 'global'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const qPrivate = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribeGlobal = onSnapshot(qGlobal, (s) => handleNewMessage(s, true), 
      (error) => handleFirestoreError(error, OperationType.LIST, 'messages/global', showError));
    
    const unsubscribePrivate = onSnapshot(qPrivate, (s) => handleNewMessage(s, false),
      (error) => handleFirestoreError(error, OperationType.LIST, 'messages/private', showError));

    return () => {
      window.removeEventListener('beforeunload', handleDisconnect);
      unsubscribeRequests();
      unsubscribeFriends();
      unsubscribeGlobal();
      unsubscribePrivate();
    };
  }, [user, activeRoom.id, view]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="min-h-screen">
      {!user ? (
        <Login />
      ) : (
        <>
          <Navbar 
            onViewProfile={() => setView('profile')} 
            onViewDashboard={() => setView('dashboard')} 
            pendingRequestsCount={pendingRequests.length}
          />
          {view === 'dashboard' ? (
            <Dashboard 
              activeRoom={activeRoom} 
              setActiveRoom={setActiveRoom} 
              pendingRequests={pendingRequests}
              friends={friends}
            />
          ) : (
            <ProfileView onBack={() => setView('dashboard')} />
          )}

          <AnimatePresence>
            {notifications.map(n => (
              <NotificationToast 
                key={n.id} 
                notification={n} 
                onClose={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))} 
              />
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
