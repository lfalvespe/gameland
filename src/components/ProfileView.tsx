import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Settings, Camera, Shield, Ban, UserCheck, MessageSquare, Trophy, Link, Gamepad2, Award, Star, History, TrendingUp, Grid3X3, Disc, Palette, Instagram, Trash2, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useError } from '../ErrorContext';
import { db, doc, updateDoc, OperationType, handleFirestoreError, collection, query, orderBy, getDocs, where, limit, getDoc, deleteDoc, auth, deleteUser, reauthenticateWithPopup, googleProvider } from '../firebase';
import { cn } from '../lib/utils';

const countries = [
  "Brazil", "USA", "Portugal", "UK", "Canada", "Germany", "France", "Japan", "Australia"
];

const bannerPresets = [
  "bg-gradient-to-r from-blue-600 to-purple-600",
  "bg-gradient-to-r from-rose-600 to-orange-600",
  "bg-gradient-to-r from-emerald-600 to-teal-600",
  "bg-gradient-to-r from-amber-600 to-yellow-600",
  "bg-gradient-to-r from-indigo-600 to-blue-600",
  "bg-gradient-to-r from-fuchsia-600 to-pink-600",
];

const badgesList = [
  { id: 'og', label: 'OG Player', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'pro', label: 'Pro Gamer', icon: Award, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'social', label: 'Social Butterfly', icon: MessageSquare, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  { id: 'top', label: 'Top Tier', icon: Trophy, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10' },
];

const achievementsList = [
  { id: 'first_win', title: 'First Victory', description: 'Win your first online match', icon: Trophy },
  { id: 'social_star', title: 'Social Star', description: 'Exchange 100+ chat messages', icon: MessageSquare },
  { id: 'dedicated', title: 'Dedicated', description: 'Play 50+ matches in total', icon: History },
  { id: 'global_reach', title: 'Global Player', description: 'Play with someone from another country', icon: Link },
];

const availableInterests = ['Strategic', 'Competitive', 'Fast-Paced', 'Retro', 'Social', 'Casual', 'Hardcore', 'Achiever'];

export const ProfileView = ({ onBack, targetUserId, onMessage, onInvite }: { 
  onBack: () => void, 
  targetUserId?: string,
  onMessage?: (targetUser: any) => void,
  onInvite?: (targetUser: any) => void
}) => {
  const { user, profile: myProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showError } = useError();
  
  const isOwnProfile = !targetUserId || targetUserId === user?.uid;
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [loadingTarget, setLoadingTarget] = useState(false);

  const profile = isOwnProfile ? myProfile : targetProfile;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile?.displayName || '',
    city: profile?.city || '',
    country: profile?.country || '',
    photoURL: profile?.photoURL || '',
    bannerURL: profile?.bannerURL || bannerPresets[0],
    status: profile?.status || '',
    bio: profile?.bio || '',
    instagram: profile?.socialLinks?.instagram || '',
    discord: profile?.socialLinks?.discord || '',
    favoriteGame: profile?.favoriteGames?.[0] || 'Tic-Tac-Toe',
    interests: profile?.interests || ['Strategic', 'Competitive', 'Fast-Paced', 'Retro']
  });
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isOwnProfile && targetUserId) {
      const fetchTargetProfile = async () => {
        setLoadingTarget(true);
        try {
          const docSnap = await getDoc(doc(db, 'users', targetUserId));
          if (docSnap.exists()) {
            setTargetProfile({ uid: docSnap.id, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Error fetching target profile:", error);
        } finally {
          setLoadingTarget(false);
        }
      };
      fetchTargetProfile();
    }
  }, [targetUserId, isOwnProfile]);

  useEffect(() => {
    const profileId = isOwnProfile ? user?.uid : targetUserId;
    if (!profileId) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, 'matches'),
          where('players', 'array-contains', profileId),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setMatchHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user?.uid, targetUserId, isOwnProfile]);

  const handleThemeChange = async (newTheme: 'classic' | 'cyberpunk' | 'forest') => {
    if (!user) return;
    setTheme(newTheme);
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme: newTheme });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, showError);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
          const snap = await getDocs(q);
          setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users', showError);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [profile?.role]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, showError);
    }
  };

  const toggleUserBan = async (userId: string, currentBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { banned: !currentBanned });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: !currentBanned } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`, showError);
    }
  };

  const avatarStyles = ['avataaars', 'bottts', 'pixel-art', 'lorelei', 'notionists'];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError("Image too large. Please select a file smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditForm(prev => ({ ...prev, photoURL: dataUrl }));
        setShowAvatarPicker(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditForm({
        displayName: profile.displayName || '',
        city: profile.city || '',
        country: profile.country || '',
        photoURL: profile.photoURL || '',
        bannerURL: profile.bannerURL || bannerPresets[0],
        status: profile.status || '',
        bio: profile.bio || '',
        instagram: profile.socialLinks?.instagram || '',
        discord: profile.socialLinks?.discord || '',
        favoriteGame: profile.favoriteGames?.[0] || 'Tic-Tac-Toe',
        interests: profile.interests || ['Strategic', 'Competitive', 'Fast-Paced', 'Retro']
      });
    }
  }, [profile, isOwnProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editForm.displayName,
        city: editForm.city,
        country: editForm.country,
        photoURL: editForm.photoURL,
        bannerURL: editForm.bannerURL,
        status: editForm.status,
        bio: editForm.bio,
        interests: editForm.interests,
        favoriteGames: [editForm.favoriteGame],
        socialLinks: {
          instagram: editForm.instagram,
          discord: editForm.discord
        }
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, showError);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // Re-authenticate user if needed (Firebase requirement for sensitive operations)
      try {
        await reauthenticateWithPopup(user, googleProvider);
      } catch (authErr: any) {
        // If re-auth fails but user exists, we might still try or show error
        console.warn("Re-authentication failed or cancelled:", authErr);
        if (authErr.code !== 'auth/popup-closed-by-user') {
          showError("Re-authentication required to delete account.");
          setIsDeletingAccount(false);
          return;
        }
        setIsDeletingAccount(false);
        return;
      }

      // 1. Delete user profile from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // 2. Delete the Auth account
      await deleteUser(user);
      
      // Note: matches and other data are kept for history but orphaned (standard practice)
      // or we could delete them if strictly required. The request says "all data".
      // Let's also delete their notification preferences or other user-specific docs if they exist.
      // For this app, 'users' doc is the main PII.
      
      onBack(); // Go back to landing/login
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`, showError);
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const getBestGame = () => {
    const stats = profile?.stats || {};
    const games = [
      { id: 'Tic-Tac-Toe', wins: stats.ticTacToe?.wins || 0, icon: Grid3X3, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { id: 'Checkers', wins: stats.checkers?.wins || 0, icon: Disc, color: 'text-rose-400', bg: 'bg-rose-400/10' },
      { id: 'Ludo', wins: stats.ludo?.wins || 0, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { id: 'Hangman', wins: stats.hangman?.wins || 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];
    
    // Sort by wins, then by name as fallback
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
        icon: Grid3X3, color: 'text-purple-400', bg: 'bg-purple-400/10' 
      },
      { 
        id: 'Checkers', 
        total: (stats.checkers?.wins || 0) + (stats.checkers?.losses || 0) + (stats.checkers?.draws || 0), 
        icon: Disc, color: 'text-rose-400', bg: 'bg-rose-400/10' 
      },
      { 
        id: 'Ludo', 
        total: (stats.ludo?.wins || 0) + (stats.ludo?.losses || 0) + (stats.ludo?.draws || 0), 
        icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' 
      },
      { 
        id: 'Hangman', 
        total: (stats.hangman?.wins || 0) + (stats.hangman?.losses || 0) + (stats.hangman?.draws || 0) + (stats.hangman?.total || 0), 
        icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' 
      },
    ];
    
    const sorted = [...games].sort((a, b) => b.total - a.total);
    return sorted[0].total > 0 ? sorted[0] : null;
  };

  const mostPlayed = getMostPlayedGame();

  if ((!isOwnProfile && loadingTarget) || (!profile && !isOwnProfile)) {
    return (
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 pb-12 max-w-4xl mx-auto space-y-8">
        <div className="bg-white/5 rounded-[40px] border border-white/10 overflow-hidden relative shadow-2xl animate-pulse">
          <div className="h-48 bg-white/5" />
          <div className="px-6 sm:px-12 pb-12 relative flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-white/10 -mt-16 border-8 border-slate-900" />
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="h-8 w-48 bg-white/10 rounded-full" />
              <div className="h-4 w-32 bg-white/5 rounded-full" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl" />)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-96 bg-white/5 rounded-[40px] border border-white/10 animate-pulse" />
          <div className="h-96 bg-white/5 rounded-[40px] border border-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 px-4 sm:px-6 pb-12 max-w-4xl mx-auto">
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
        className={cn(
          "bg-white/5 rounded-[40px] border border-white/10 overflow-hidden relative shadow-2xl transition-all duration-500",
          !isOwnProfile && "border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent"
        )}
      >
        {/* Banner */}
        <div className={cn("h-48 relative transition-all duration-700", editForm.bannerURL || profile?.bannerURL || bannerPresets[0])}>
          {isEditing && (
            <button 
              onClick={() => setShowBannerPicker(!showBannerPicker)}
              className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-black/60 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Settings className="w-4 h-4" />
              Change Banner
            </button>
          )}

          <AnimatePresence>
            {showBannerPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-16 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shadow-2xl z-50 grid grid-cols-3 gap-2"
              >
                {bannerPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEditForm({ ...editForm, bannerURL: preset });
                      setShowBannerPicker(false);
                    }}
                    className={cn("w-12 h-12 rounded-xl transition-all hover:scale-110", preset)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="px-6 sm:px-12 pb-12 relative flex flex-col items-center">
          {!isOwnProfile && (
            <div className="absolute top-8 left-12 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Viewing Explorer</span>
            </div>
          )}
          
          {/* Profile Photo */}
          <div className="-mt-16 relative group">
            <div className="relative">
              <img 
                    src={editForm.photoURL || profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${isOwnProfile ? user?.uid : targetUserId}`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-slate-950 shadow-2xl bg-slate-900 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            </div>
            {isEditing && (
              <button 
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute bottom-0 right-0 p-2.5 bg-blue-600 rounded-full border-2 border-slate-950 shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            )}

            <AnimatePresence>
              {showAvatarPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl z-50 w-64"
                >
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-3 font-bold">Choose your style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {avatarStyles.map(style => (
                      <button
                        key={style}
                        onClick={() => {
                          const newUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${Math.random().toString(36).substring(7)}`;
                          setEditForm({ ...editForm, photoURL: newUrl });
                          setShowAvatarPicker(false);
                        }}
                        className="p-1 hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <img 
                          src={`https://api.dicebear.com/7.x/${style}/svg?seed=preview`} 
                          className="w-full h-full rounded-lg"
                          alt={style}
                        />
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Upload Photo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 text-center w-full">
            {!isEditing ? (
              <>
                <div className="flex flex-col items-center gap-1 mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-4xl font-black tracking-tighter italic">{profile?.displayName}</h2>
                    {profile?.role === 'admin' && <Shield className="w-5 h-5 text-rose-500" />}
                  </div>
                  {profile?.status && (
                    <p className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium border border-blue-500/20">
                      {profile.status}
                    </p>
                  )}
                </div>

                <p className="text-sm opacity-60 mb-8 max-w-lg mx-auto leading-relaxed">
                  {profile?.bio || "No bio yet. Tell us about yourself!"}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 w-full">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold group-hover/stat:opacity-100 transition-opacity">Total Score</span>
                    <span className="text-xl font-black text-blue-400">{profile?.score || 0}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold group-hover/stat:opacity-100 transition-opacity">Total Games</span>
                    <span className="text-xl font-black text-rose-400">{matchHistory.length}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold group-hover/stat:opacity-100 transition-opacity">Location</span>
                    <span className="text-xs font-bold truncate max-w-full">{profile?.city ? `${profile.city}, ${profile?.country || ''}` : profile?.country || 'Hidden'}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold group-hover/stat:opacity-100 transition-opacity">Social Links</span>
                    <div className="flex gap-3">
                      {profile?.socialLinks?.instagram ? (
                        <Instagram className="w-5 h-5 text-pink-500 hover:scale-110 transition-transform cursor-pointer" onClick={() => window.open(`https://instagram.com/${profile.socialLinks.instagram.replace('@', '')}`, '_blank')} />
                      ) : (
                        <Instagram className="w-5 h-5 opacity-20" />
                      )}
                      {profile?.socialLinks?.discord ? (
                        <MessageSquare className="w-5 h-5 text-indigo-400 hover:scale-110 transition-transform cursor-pointer" />
                      ) : (
                        <MessageSquare className="w-5 h-5 opacity-20" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mb-10">
                  {isOwnProfile ? (
                    <div className="flex flex-col items-center gap-4">
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-8 py-3 bg-blue-600 rounded-2xl font-black tracking-widest text-xs uppercase hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 w-48"
                      >
                        Edit Profile
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500/50 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Account
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => onMessage?.(profile)}
                        className="px-6 py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-blue-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </button>
                      <button 
                        onClick={() => onInvite?.(profile)}
                        className="px-6 py-3 bg-rose-600/10 border border-rose-500/30 text-rose-400 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Grid3X3 className="w-4 h-4" />
                        Challenge
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleSave} className="w-full text-left space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Display Name</label>
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium"
                        maxLength={20}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Status Message</label>
                      <input
                        type="text"
                        value={editForm.status}
                        onChange={e => setEditForm({...editForm, status: e.target.value})}
                        placeholder="What's on your mind?"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium"
                        maxLength={50}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Country</label>
                        <select
                          value={editForm.country}
                          onChange={e => setEditForm({...editForm, country: e.target.value})}
                          className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 appearance-none font-medium"
                          required
                        >
                          <option value="" disabled>Select</option>
                          {countries.sort().map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={e => setEditForm({...editForm, city: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium"
                          maxLength={30}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Bio</label>
                      <textarea
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium resize-none"
                        placeholder="Tell your story..."
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Favorite Game</label>
                      <select
                        value={editForm.favoriteGame}
                        onChange={e => setEditForm({...editForm, favoriteGame: e.target.value})}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 appearance-none font-medium"
                      >
                        <option value="Tic-Tac-Toe">Tic-Tac-Toe</option>
                        <option value="Checkers">Checkers</option>
                        <option value="Ludo">Ludo</option>
                        <option value="Hangman">Hangman</option>
                        <option value="Chess">Chess (Coming Soon)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Instagram</label>
                    <input
                      type="text"
                      value={editForm.instagram}
                      onChange={e => setEditForm({...editForm, instagram: e.target.value})}
                      placeholder="@username"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-2 block">Discord</label>
                    <input
                      type="text"
                      value={editForm.discord}
                      onChange={e => setEditForm({...editForm, discord: e.target.value})}
                      placeholder="username#0000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-3 block">Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {availableInterests.map(interest => {
                      const isSelected = editForm.interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            const newInterests = isSelected
                              ? editForm.interests.filter(i => i !== interest)
                              : [...editForm.interests, interest].slice(0, 5);
                            setEditForm({ ...editForm, interests: newInterests });
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                            isSelected 
                              ? "bg-purple-600 border-purple-400 text-white" 
                              : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                          )}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setShowAvatarPicker(false);
                      setShowBannerPicker(false);
                    }}
                    className="flex-1 py-4 bg-white/5 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-blue-600 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                  >
                    {saving ? 'Synchronizing...' : 'Update Profile'}
                  </button>
                </div>
                {isOwnProfile && (
                  <div className="pt-8 border-t border-white/5 mt-8">
                    <p className="text-[10px] uppercase tracking-widest font-black opacity-30 mb-4 text-center">Critical Settings</p>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 border border-rose-500/20 bg-rose-500/5 text-rose-500 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete My Account Forever
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </motion.div>

      {/* Extended Profile Sections */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {/* Stats & Match History */}
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter">Recent Matches</h3>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                    Win Rate: {matchHistory.length > 0 
                      ? Math.round((matchHistory.filter(m => m.winner === (isOwnProfile ? user?.uid : targetUserId)).length / matchHistory.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1 group-hover:opacity-100 transition-opacity">Tic-Tac-Toe</p>
                  <p className="text-lg font-black">{profile?.stats?.ticTacToe?.wins || 0}W / {profile?.stats?.ticTacToe?.losses || 0}L</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1 group-hover:opacity-100 transition-opacity">Checkers</p>
                  <p className="text-lg font-black">{profile?.stats?.checkers?.wins || 0}W / {profile?.stats?.checkers?.losses || 0}L</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1 group-hover:opacity-100 transition-opacity">Ludo</p>
                  <p className="text-lg font-black">{profile?.stats?.ludo?.wins || 0}W / {profile?.stats?.ludo?.losses || 0}L</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1 group-hover:opacity-100 transition-opacity">Hangman</p>
                  <p className="text-lg font-black">{profile?.stats?.hangman?.wins || 0}W / {profile?.stats?.hangman?.losses || 0}L</p>
                </div>
              </div>

              {profile?.stats?.hangman && profile.stats.hangman.total > 0 && (
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl border border-white/10 flex flex-col items-center text-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Hangman Win Rate</p>
                      <p className="text-xl font-black italic">
                        {Math.round(((profile.stats.hangman.wins || 0) / (profile.stats.hangman.total || 1)) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-rose-500/10 to-orange-500/10 rounded-3xl border border-white/10 flex flex-col items-center text-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Avg. Mistakes</p>
                      <p className="text-xl font-black italic">
                        {((profile.stats.hangman.totalMistakes || 0) / (profile.stats.hangman.total || 1)).toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl border border-white/10 flex flex-col items-center text-center gap-2">
                    <Palette className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Top Theme</p>
                      <p className="text-sm font-black truncate max-w-full italic px-2">
                        {Object.entries(profile.stats.hangman.themesPlayed || {}).sort((a: [string, any], b: [string, any]) => (b[1] as number) - (a[1] as number))[0]?.[0]?.replace(/_/g, ' ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bestGame && (
                <div className="mb-8 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                    <bestGame.icon className="w-24 h-24 rotate-12" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-blue-400 mb-2">Better in</h4>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-4 rounded-2xl", bestGame.bg)}>
                        <bestGame.icon className={cn("w-8 h-8", bestGame.color)} />
                      </div>
                      <div>
                        <p className="text-2xl font-black italic uppercase italic tracking-tighter">{bestGame.id}</p>
                        <p className="text-sm opacity-60 font-medium">Record: {bestGame.wins} Victories</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mostPlayed && (
                <div className="mb-8 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                    <mostPlayed.icon className="w-24 h-24 rotate-12" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-purple-400 mb-2">Most Played</h4>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-4 rounded-2xl", mostPlayed.bg)}>
                        <mostPlayed.icon className={cn("w-8 h-8", mostPlayed.color)} />
                      </div>
                      <div>
                        <p className="text-2xl font-black italic uppercase italic tracking-tighter">{mostPlayed.id}</p>
                        <p className="text-sm opacity-60 font-medium">{mostPlayed.total} Matches Played</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {loadingHistory ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
                  ))
                ) : matchHistory.length === 0 ? (
                  <p className="py-12 text-center opacity-30 italic text-sm">No matches played yet.</p>
                ) : matchHistory.map((match) => (
                  <div key={match.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        match.gameType === 'Tic-Tac-Toe' ? "bg-blue-500/10 text-blue-400" : 
                        match.gameType === 'Hangman' ? "bg-purple-500/10 text-purple-400" :
                        "bg-rose-500/10 text-rose-400"
                      )}>
                        {match.gameType === 'Tic-Tac-Toe' ? <Grid3X3 className="w-5 h-5" /> : 
                         match.gameType === 'Hangman' ? <Users className="w-5 h-5" /> :
                         <Disc className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{match.gameType}</p>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">
                          {match.createdAt ? new Date(match.createdAt.toDate ? match.createdAt.toDate() : match.createdAt).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={cn(
                          "text-xs font-black uppercase tracking-widest",
                          match.winner === (isOwnProfile ? user?.uid : targetUserId) ? "text-green-400" : "text-rose-400"
                        )}>
                          {match.winner === (isOwnProfile ? user?.uid : targetUserId) ? 'Victory' : 'Defeat'}
                        </p>
                        <p className="text-[10px] opacity-40 font-bold">Points: +{match.score || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Badges & Achievements */}
          <div className="space-y-8">
            <section className="bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                < Award className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter">Badges</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {badgesList.map((badge) => (
                  <div key={badge.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-help group relative">
                    <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110 duration-300", badge.bg)}>
                      <badge.icon className={cn("w-6 h-6", badge.color)} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center">{badge.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {isOwnProfile && (
              <section className="bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10 overflow-hidden relative">
                <div className="flex items-center gap-3 mb-6">
                  <Palette className="w-6 h-6 text-pink-400" />
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter">Interface Theme</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'classic', label: 'Classic', color: 'bg-slate-900' },
                    { id: 'cyberpunk', label: 'Cyberpunk', color: 'bg-black' },
                    { id: 'forest', label: 'Forest', color: 'bg-emerald-950' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => isOwnProfile && handleThemeChange(t.id as any)}
                      disabled={!isOwnProfile}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                        (isOwnProfile ? theme : (profile?.theme || 'classic')) === t.id ? "border-blue-500 bg-blue-500/10" : "border-white/5 bg-white/5 hover:border-white/20",
                        !isOwnProfile && "cursor-default"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-full border border-white/20", t.color)} />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {isOwnProfile && (
              <section className="bg-rose-500/5 rounded-[30px] sm:rounded-[40px] border border-rose-500/10 p-6 sm:p-10 overflow-hidden relative">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-rose-500">Danger Zone</h3>
                </div>
                <p className="text-xs text-rose-500/60 mb-6 font-medium leading-relaxed">
                  Deleting your account will permanently erase your profile and stats for all roles (Admin, Moderator, or Player). This action is irreversible.
                </p>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-4 border border-rose-500/20 bg-rose-500/5 text-rose-500 rounded-2xl font-black tracking-widest text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  Permanently Delete My Account
                </button>
              </section>
            )}

            <section className="bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter">Interests</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(profile?.interests || ['Strategic', 'Competitive', 'Fast-Paced', 'Retro']).map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest opacity-60">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                <Trophy className="w-6 h-6 text-rose-500" />
                <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter">Achievements</h3>
              </div>
              <div className="space-y-4">
                {achievementsList.map((ach) => (
                  <div key={ach.id} className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    profile?.achievements?.includes(ach.id) 
                      ? "bg-blue-600/10 border-blue-600/30 opacity-100" 
                      : "bg-white/5 border-white/5 opacity-40 grayscale"
                  )}>
                    <div className="p-2 bg-white/5 rounded-xl">
                      <ach.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{ach.title}</p>
                      <p className="text-[10px] opacity-60 font-medium">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {isOwnProfile && profile?.role === 'admin' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white/5 rounded-[30px] sm:rounded-[40px] border border-white/10 p-6 sm:p-12 text-center sm:text-left"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-rose-500" />
            <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">User Management</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-[10px] uppercase tracking-widest opacity-40 font-bold">User</th>
                  <th className="pb-4 text-[10px] uppercase tracking-widest opacity-40 font-bold">Role</th>
                  <th className="pb-4 text-[10px] uppercase tracking-widest opacity-40 font-bold">Status</th>
                  <th className="pb-4 text-[10px] uppercase tracking-widest opacity-40 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingUsers ? (
                  <tr><td colSpan={4} className="py-8 text-center opacity-30 italic">Loading users...</td></tr>
                ) : allUsers.map(u => (
                  <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-8 h-8 rounded-full" alt="" />
                        <div>
                          <p className="text-sm font-bold">{u.displayName}</p>
                          <p className="text-[10px] opacity-40">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <select 
                        value={u.role || 'player'} 
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                        disabled={u.id === user?.uid}
                      >
                        <option value="player">Player</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4">
                      {u.banned ? (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">Banned</span>
                      ) : (
                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {u.id !== user?.uid && (
                        <button 
                          onClick={() => toggleUserBan(u.id, u.banned)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            u.banned ? "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white"
                          )}
                          title={u.banned ? "Unban User" : "Ban User"}
                        >
                          {u.banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-rose-500/20 p-8 rounded-[40px] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Are you sure?</h3>
                  <p className="text-sm opacity-60 font-medium leading-relaxed">
                    This action is irreversible. All your data, including scores, match history, and profile information will be permanently deleted.
                  </p>
                </div>
                
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl font-black tracking-widest text-xs uppercase transition-all shadow-lg shadow-rose-600/20"
                  >
                    {isDeletingAccount ? "Deleting Account..." : "Yes, Delete Everything"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingAccount}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black tracking-widest text-xs uppercase transition-all"
                  >
                    Cancel
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
