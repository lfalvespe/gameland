import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Search, Trash2, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { db, collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, OperationType, handleFirestoreError } from '../firebase';
import { cn } from '../lib/utils';

export const Chat = ({ socket, activeRoom, onBack }: { socket: any, activeRoom: { id: string, name: string, isPrivate: boolean, friendId?: string }, onBack?: () => void }) => {
  const { user, profile } = useAuth();
  const { showError } = useError();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [friendStatus, setFriendStatus] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: string}>({});
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

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
    if (!user) return;

    let q;
    if (activeRoom.id === 'global') {
      q = query(
        collection(db, 'messages'), 
        where('roomId', '==', 'global'),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'messages'), 
        where('roomId', '==', activeRoom.id),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages.reverse());

      // Mark unread messages as read in private chat
      if (activeRoom.isPrivate) {
        snapshot.docs.forEach(async (messageDoc) => {
          const data = messageDoc.data();
          if (data.senderId !== user.uid && !data.read) {
            await updateDoc(doc(db, 'messages', messageDoc.id), { read: true })
              .catch(err => console.error("Error marking message as read:", err));
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages', showError);
    });

    return () => unsubscribe();
  }, [activeRoom.id, user]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ roomId, userName, isTyping, userId }: any) => {
      if (roomId === activeRoom.id) {
        setTypingUsers(prev => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = userName;
          } else {
            delete next[userId];
          }
          return next;
        });
      }
    };

    socket.on('user_typing', handleTyping);
    
    // Clear typing indicators when room changes
    setTypingUsers({});

    return () => {
      socket.off('user_typing', handleTyping);
    };
  }, [socket, activeRoom.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (socket && user) {
      socket.emit('typing_status', {
        roomId: activeRoom.id,
        toUserId: activeRoom.isPrivate ? activeRoom.friendId : null,
        isTyping: value.length > 0,
        userName: profile?.displayName || 'Someone'
      });
    }
  };

  const deleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await deleteDoc(doc(db, 'messages', messageToDelete));
      setMessageToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageToDelete}`, showError);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    try {
      const messageData = {
        senderId: user.uid,
        senderName: profile?.displayName || 'Anonymous',
        senderPhotoURL: profile?.photoURL || '',
        text: input,
        createdAt: serverTimestamp(),
        roomId: activeRoom.id,
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      if (activeRoom.isPrivate) {
        await updateDoc(doc(db, 'rooms', activeRoom.id), {
          lastMessage: input,
          lastMessageAt: serverTimestamp(),
          lastSenderId: user.uid
        }).catch(err => console.error("Error updating room last message:", err));
      }

      if (activeRoom.isPrivate && activeRoom.friendId && socket) {
        socket.emit('send_private_message', {
          toUserId: activeRoom.friendId,
          message: {
            ...messageData,
            createdAt: new Date().toISOString() // Fallback for real-time
          }
        });
      }

      setInput('');

      if (socket && user) {
        socket.emit('typing_status', {
          roomId: activeRoom.id,
          toUserId: activeRoom.isPrivate ? activeRoom.friendId : null,
          isTyping: false,
          userName: profile?.displayName || 'Someone'
        });
      }
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
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === user?.uid;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

          const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
          const isSameSenderAsNext = nextMsg && nextMsg.senderId === msg.senderId;

          const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate().getTime() : (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now());
          const prevMsgTime = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate().getTime() : (prevMsg?.createdAt ? new Date(prevMsg.createdAt).getTime() : 0);
          const nextMsgTime = nextMsg?.createdAt?.toDate ? nextMsg.createdAt.toDate().getTime() : (nextMsg?.createdAt ? new Date(nextMsg.createdAt).getTime() : 0);

          const isRecentAsPrev = prevMsg && Math.abs(msgTime - prevMsgTime) < 5 * 60 * 1000;
          const isRecentAsNext = nextMsg && Math.abs(nextMsgTime - msgTime) < 5 * 60 * 1000;

          const isFirstInGroup = !isSameSenderAsPrev || !isRecentAsPrev;
          const isLastInGroup = !isSameSenderAsNext || !isRecentAsNext;

          const showDate = index === 0 || 
            (msg.createdAt?.toDate && prevMsg?.createdAt?.toDate && 
             msg.createdAt.toDate().toDateString() !== prevMsg.createdAt.toDate().toDateString());

          return (
            <React.Fragment key={msg.id}>
              {showDate && msg.createdAt?.toDate && (
                <div className="flex justify-center my-6">
                  <span className="text-[10px] uppercase tracking-widest opacity-30 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {formatMessageDate(msg.createdAt.toDate())}
                  </span>
                </div>
              )}
              <div className={cn(
                "flex gap-3 max-w-[85%] group/msg",
                isMe ? "ml-auto flex-row-reverse" : "mr-auto",
                isFirstInGroup ? "mt-4" : "mt-0.5"
              )}>
                {/* Avatar logic: 
                    Global: Only show if first in group
                    Private: Always show if last in group (aligned to bottom)
                */}
                <div className="w-8 flex-shrink-0">
                  {((!isMe && activeRoom.isPrivate) || (!isMe && !activeRoom.isPrivate && isFirstInGroup)) ? (
                    isFirstInGroup && (
                      <img 
                        src={msg.senderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                        className="w-8 h-8 rounded-full bg-white/10 border border-white/10 mt-1 flex-shrink-0"
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="w-8" />
                  )}
                </div>

                <div className={cn(
                  "flex flex-col min-w-0",
                  isMe ? "items-end" : "items-start"
                )}>
                  {!isMe && !activeRoom.isPrivate && isFirstInGroup && (
                    <span className="text-[10px] font-bold opacity-40 mb-1 ml-1 tracking-tight">{msg.senderName}</span>
                  )}
                  
                  <div className="relative group/bubble flex items-center gap-2">
                    {isMe && (
                      <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[9px] font-medium text-white/30 whitespace-nowrap">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </div>
                    )}

                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl shadow-sm relative group/inner",
                      isMe 
                        ? cn("bg-blue-600 text-white", isFirstInGroup ? "rounded-tr-sm" : "rounded-tr-2xl") 
                        : cn("bg-white/10 text-white", isFirstInGroup ? "rounded-tl-sm" : "rounded-tl-2xl")
                    )}>
                      <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                      
                      {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                        <button 
                          onClick={() => setMessageToDelete(msg.id)}
                          className={cn(
                            "absolute -top-2 p-1 bg-rose-500 rounded-lg transition-opacity",
                            "opacity-0 md:group-hover/inner:opacity-100",
                            isMe ? "-left-2" : "-right-2"
                          )}
                          title="Delete Message"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>

                    {!isMe && (
                      <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[9px] font-medium text-white/30 whitespace-nowrap">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </div>
                    )}
                  </div>

                  {isLastInGroup && isMe && activeRoom.isPrivate && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tighter",
                        msg.read ? "text-blue-400" : "opacity-20"
                      )}>
                        {msg.read ? 'Read' : 'Sent'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            {!activeRoom.isPrivate && (
              <span className="text-[10px] opacity-50 ml-2 mb-1">
                {Object.values(typingUsers).join(', ')}
              </span>
            )}
            <div className="bg-white/5 text-white px-4 py-2 rounded-2xl rounded-tl-sm flex gap-1 items-center">
              <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-1.5 h-1.5 bg-white/40 rounded-full" 
              />
              <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-white/40 rounded-full" 
              />
              <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-white/40 rounded-full" 
              />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {messageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Delete Message?</h3>
                <p className="text-sm opacity-50 mb-8">This action cannot be undone. The message will be removed for everyone.</p>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setMessageToDelete(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteMessage}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
