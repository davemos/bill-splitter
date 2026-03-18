import { ref, set, get, update } from 'firebase/database';
import { getFirebaseDB } from './firebase';
import type { UserProfile, UserWallet, WalletCard, WalletPaymentLink } from '../types';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `users/${profile.uid}/profile`), profile);
}

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, `users/${uid}/profile`));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const db = getFirebaseDB();
  await update(ref(db, `users/${uid}/profile`), { displayName });
}

export async function updateNickname(uid: string, nickname: string): Promise<void> {
  const db = getFirebaseDB();
  await update(ref(db, `users/${uid}/profile`), { nickname });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function loadWallet(uid: string): Promise<UserWallet> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, `users/${uid}/wallet`));
  if (!snap.exists()) return { cards: [], paymentLinks: [] };
  const data = snap.val();
  return {
    cards: data.cards ? Object.values(data.cards) as WalletCard[] : [],
    paymentLinks: data.paymentLinks
      ? Object.values(data.paymentLinks) as WalletPaymentLink[]
      : [],
  };
}

export async function saveWalletCard(uid: string, card: WalletCard): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `users/${uid}/wallet/cards/${card.id}`), card);
}

export async function deleteWalletCard(uid: string, cardId: string): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `users/${uid}/wallet/cards/${cardId}`), null);
}

export async function savePaymentLink(uid: string, link: WalletPaymentLink): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `users/${uid}/wallet/paymentLinks/${link.id}`), link);
}

export async function deletePaymentLink(uid: string, linkId: string): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `users/${uid}/wallet/paymentLinks/${linkId}`), null);
}
