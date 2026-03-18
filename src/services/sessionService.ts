import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off,
  type Unsubscribe,
} from 'firebase/database';
import * as SecureStore from 'expo-secure-store';
import { getFirebaseDB } from './firebase';
import { useSessionStore } from '../store/useSessionStore';
import type { SessionExtras, SessionItem } from '../types';

// ─── Device identity ──────────────────────────────────────────────────────────

const DEVICE_ID_KEY = 'multiplayer_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

// ─── Session code generation ──────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1

function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

async function claimUniqueCode(): Promise<string> {
  const db = getFirebaseDB();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const snap = await get(ref(db, `sessionCodes/${code}`));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate a unique session code. Please try again.');
}

// ─── Host: create session ─────────────────────────────────────────────────────

export async function createSession(hostName: string, venmoHandle?: string): Promise<string> {
  const db = getFirebaseDB();
  const deviceId = await getOrCreateDeviceId();
  const code = await claimUniqueCode();

  const newSessionRef = push(ref(db, 'sessions'));
  const sessionId = newSessionRef.key!;

  const meta: Record<string, unknown> = {
    code,
    hostDeviceId: deviceId,
    createdAt: Date.now(),
    status: 'lobby',
  };
  if (venmoHandle) meta.hostVenmo = venmoHandle;

  const now = Date.now();
  await update(ref(db), {
    [`sessions/${sessionId}/meta`]: meta,
    [`sessions/${sessionId}/participants/${deviceId}`]: {
      name: hostName.trim(),
      isHost: true,
      joinedAt: now,
    },
    [`sessions/${sessionId}/extras`]: {
      taxAmount: 0,
      tipMode: 'percentage',
      tipValue: 18,
      discounts: {},
    },
    [`sessionCodes/${code}`]: sessionId,
  });

  useSessionStore.getState().setSession({
    sessionId,
    sessionCode: code,
    myDeviceId: deviceId,
    myName: hostName.trim(),
    isHost: true,
  });

  subscribeToSession(sessionId);
  return sessionId;
}

// ─── Guest: join session ──────────────────────────────────────────────────────

export async function joinSession(
  code: string,
  guestName: string
): Promise<string> {
  const db = getFirebaseDB();
  const deviceId = await getOrCreateDeviceId();
  const upperCode = code.trim().toUpperCase();

  const codeSnap = await get(ref(db, `sessionCodes/${upperCode}`));
  if (!codeSnap.exists()) {
    throw new Error(`No session found with code "${upperCode}". Check the code and try again.`);
  }
  const sessionId: string = codeSnap.val();

  const statusSnap = await get(ref(db, `sessions/${sessionId}/meta/status`));
  if (statusSnap.val() === 'closed') {
    throw new Error('This session has already ended.');
  }

  await set(ref(db, `sessions/${sessionId}/participants/${deviceId}`), {
    name: guestName.trim(),
    isHost: false,
    joinedAt: Date.now(),
  });

  useSessionStore.getState().setSession({
    sessionId,
    sessionCode: upperCode,
    myDeviceId: deviceId,
    myName: guestName.trim(),
    isHost: false,
  });

  subscribeToSession(sessionId);
  return sessionId;
}

// ─── Real-time listeners ──────────────────────────────────────────────────────

const activeUnsubs: Unsubscribe[] = [];

export function subscribeToSession(sessionId: string): void {
  const db = getFirebaseDB();

  const statusRef = ref(db, `sessions/${sessionId}/meta/status`);
  activeUnsubs.push(
    onValue(statusRef, (snap) => {
      useSessionStore.getState().setStatus(snap.val() ?? 'lobby');
    })
  );

  const participantsRef = ref(db, `sessions/${sessionId}/participants`);
  activeUnsubs.push(
    onValue(participantsRef, (snap) => {
      useSessionStore.getState().setParticipants(snap.val() ?? {});
    })
  );

  const itemsRef = ref(db, `sessions/${sessionId}/items`);
  activeUnsubs.push(
    onValue(itemsRef, (snap) => {
      const raw = snap.val() as Record<
        string,
        Omit<SessionItem, 'id'>
      > | null;
      const items: SessionItem[] = raw
        ? Object.entries(raw)
            .map(([id, data]) => ({ ...data, id }))
            .sort((a, b) => a.addedAt - b.addedAt)
        : [];
      useSessionStore.getState().setItems(items);
    })
  );

  const claimsRef = ref(db, `sessions/${sessionId}/claims`);
  activeUnsubs.push(
    onValue(claimsRef, (snap) => {
      useSessionStore.getState().setClaims(snap.val() ?? {});
    })
  );

  const extrasRef = ref(db, `sessions/${sessionId}/extras`);
  activeUnsubs.push(
    onValue(extrasRef, (snap) => {
      if (snap.exists()) useSessionStore.getState().setExtras(snap.val());
    })
  );

  const hostVenmoRef = ref(db, `sessions/${sessionId}/meta/hostVenmo`);
  activeUnsubs.push(
    onValue(hostVenmoRef, (snap) => {
      useSessionStore.getState().setHostVenmo(snap.val() ?? null);
    })
  );

  useSessionStore.getState().setSyncStatus('synced');
}

export function unsubscribeFromSession(): void {
  activeUnsubs.forEach((unsub) => unsub());
  activeUnsubs.length = 0;
}

// ─── Host: item management ────────────────────────────────────────────────────

export async function addSessionItem(
  sessionId: string,
  deviceId: string,
  item: { name: string; price: number }
): Promise<void> {
  const db = getFirebaseDB();
  await push(ref(db, `sessions/${sessionId}/items`), {
    name: item.name,
    price: item.price,
    addedAt: Date.now(),
    addedByDeviceId: deviceId,
  });
}

export async function bulkAddSessionItems(
  sessionId: string,
  deviceId: string,
  items: Array<{ name: string; price: number }>
): Promise<void> {
  const db = getFirebaseDB();
  const updates: Record<string, unknown> = {};
  const now = Date.now();
  items.forEach((item, i) => {
    const newRef = push(ref(db, `sessions/${sessionId}/items`));
    updates[`sessions/${sessionId}/items/${newRef.key}`] = {
      name: item.name,
      price: item.price,
      addedAt: now + i, // ensure ordering when added in batch
      addedByDeviceId: deviceId,
    };
  });
  await update(ref(db), updates);
}

export async function removeSessionItem(
  sessionId: string,
  itemId: string
): Promise<void> {
  const db = getFirebaseDB();
  await update(ref(db), {
    [`sessions/${sessionId}/items/${itemId}`]: null,
    [`sessions/${sessionId}/claims/${itemId}`]: null,
  });
}

// ─── Participant: claim management ────────────────────────────────────────────

export async function claimItem(
  sessionId: string,
  itemId: string,
  deviceId: string
): Promise<void> {
  const db = getFirebaseDB();
  await set(
    ref(db, `sessions/${sessionId}/claims/${itemId}/${deviceId}`),
    true
  );
}

export async function unclaimItem(
  sessionId: string,
  itemId: string,
  deviceId: string
): Promise<void> {
  const db = getFirebaseDB();
  await remove(ref(db, `sessions/${sessionId}/claims/${itemId}/${deviceId}`));
}

// ─── Host: extras management ──────────────────────────────────────────────────

export async function updateSessionExtras(
  sessionId: string,
  patch: Partial<Omit<SessionExtras, 'discounts'>>
): Promise<void> {
  const db = getFirebaseDB();
  const updates: Record<string, unknown> = {};
  Object.entries(patch).forEach(([key, val]) => {
    updates[`sessions/${sessionId}/extras/${key}`] = val;
  });
  await update(ref(db), updates);
}

export async function addSessionDiscount(
  sessionId: string,
  discount: { label: string; amount: number }
): Promise<void> {
  const db = getFirebaseDB();
  await push(ref(db, `sessions/${sessionId}/extras/discounts`), discount);
}

export async function removeSessionDiscount(
  sessionId: string,
  discountId: string
): Promise<void> {
  const db = getFirebaseDB();
  await remove(
    ref(db, `sessions/${sessionId}/extras/discounts/${discountId}`)
  );
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

export async function openBill(sessionId: string): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `sessions/${sessionId}/meta/status`), 'open');
}

export async function closeBill(sessionId: string): Promise<void> {
  const db = getFirebaseDB();
  const codeSnap = await get(ref(db, `sessions/${sessionId}/meta/code`));
  await set(ref(db, `sessions/${sessionId}/meta/status`), 'closed');
  if (codeSnap.exists()) {
    await remove(ref(db, `sessionCodes/${codeSnap.val()}`));
  }
  unsubscribeFromSession();
  useSessionStore.getState().resetSession();
}
