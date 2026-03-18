import { create } from 'zustand';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../services/firebase';
import { loadProfile, loadWallet, saveProfile } from '../services/userService';
import { signOut as firebaseSignOut } from '../services/authService';
import type { UserProfile, UserWallet } from '../types';

const AVATAR_COLORS = [
  '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444',
];

function pickColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  wallet: UserWallet | null;
  isInitialized: boolean;

  initialize: () => () => void; // returns unsubscribe
  setProfile: (p: UserProfile) => void;
  setWallet: (w: UserWallet) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  wallet: null,
  isInitialized: false,

  initialize: () => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await loadProfile(user.uid);
        if (!profile) {
          profile = {
            uid: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
            avatarColor: pickColor(user.email ?? user.uid),
            createdAt: Date.now(),
          };
          await saveProfile(profile);
        }
        const wallet = await loadWallet(user.uid);
        set({ user, profile, wallet, isInitialized: true });
      } else {
        set({ user: null, profile: null, wallet: null, isInitialized: true });
      }
    });
    return unsub;
  },

  setProfile: (profile) => set({ profile }),
  setWallet: (wallet) => set({ wallet }),

  signOut: async () => {
    await firebaseSignOut();
    set({ user: null, profile: null, wallet: null });
  },
}));
