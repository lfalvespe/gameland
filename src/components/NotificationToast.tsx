import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';

export const NotificationToast = ({ notification, onClose, onClick, onDecline }: { notification: any, onClose: () => void, onClick: () => void, onDecline?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    onClick={onClick}
    className="fixed bottom-6 right-6 z-[100] w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex gap-4 items-start cursor-pointer hover:bg-slate-800 transition-colors group"
  >
    <div className="p-2 bg-blue-600/20 rounded-xl">
      <MessageSquare className="w-5 h-5 text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400">{notification.roomName}</p>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="opacity-30 hover:opacity-100 p-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <p className="text-sm font-bold truncate">{notification.senderName}</p>
      <p className="text-sm opacity-60 line-clamp-2">{notification.text}</p>
      
      {notification.type === 'rematch' && (
        <div className="flex gap-2 mt-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Accept
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDecline?.(); }}
            className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  </motion.div>
);
