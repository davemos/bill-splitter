import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  LocalSessionState,
  SessionItem,
  SessionClaims,
  SessionExtras,
  SessionParticipant,
  SessionStatus,
} from '../types';

const DEFAULT_EXTRAS: SessionExtras = {
  taxAmount: 0,
  tipMode: 'percentage',
  tipValue: 18,
  discounts: {},
};

const INITIAL_STATE: LocalSessionState = {
  sessionId: null,
  sessionCode: null,
  myDeviceId: null,
  myName: null,
  isHost: false,
  hostVenmo: null,
  status: 'lobby',
  participants: {},
  items: [],
  claims: {},
  extras: DEFAULT_EXTRAS,
  syncStatus: 'idle',
  syncError: null,
};

interface SessionActions {
  setSession: (params: {
    sessionId: string;
    sessionCode: string;
    myDeviceId: string;
    myName: string;
    isHost: boolean;
  }) => void;
  setStatus: (status: SessionStatus) => void;
  setParticipants: (participants: Record<string, SessionParticipant>) => void;
  setItems: (items: SessionItem[]) => void;
  setClaims: (claims: SessionClaims) => void;
  setExtras: (extras: SessionExtras) => void;
  setHostVenmo: (venmo: string | null) => void;
  setSyncStatus: (
    status: LocalSessionState['syncStatus'],
    error?: string
  ) => void;
  resetSession: () => void;
}

export const useSessionStore = create<LocalSessionState & SessionActions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    setSession: ({ sessionId, sessionCode, myDeviceId, myName, isHost }) =>
      set((state) => {
        state.sessionId = sessionId;
        state.sessionCode = sessionCode;
        state.myDeviceId = myDeviceId;
        state.myName = myName;
        state.isHost = isHost;
        state.syncStatus = 'connecting';
      }),

    setStatus: (status) =>
      set((state) => {
        state.status = status;
      }),

    setParticipants: (participants) =>
      set((state) => {
        state.participants = participants;
      }),

    setItems: (items) =>
      set((state) => {
        state.items = items;
      }),

    setClaims: (claims) =>
      set((state) => {
        state.claims = claims;
      }),

    setExtras: (extras) =>
      set((state) => {
        state.extras = extras;
      }),

    setHostVenmo: (venmo) =>
      set((state) => {
        state.hostVenmo = venmo;
      }),

    setSyncStatus: (status, error) =>
      set((state) => {
        state.syncStatus = status;
        state.syncError = error ?? null;
      }),

    resetSession: () => set(() => ({ ...INITIAL_STATE })),
  }))
);

// ─── Pure selectors ───────────────────────────────────────────────────────────

export function selectMyClaimedItemIds(
  claims: SessionClaims,
  myDeviceId: string | null
): string[] {
  if (!myDeviceId) return [];
  return Object.entries(claims)
    .filter(([, claimers]) => claimers[myDeviceId] === true)
    .map(([itemId]) => itemId);
}

export function selectClaimCount(
  claims: SessionClaims,
  itemId: string
): number {
  return Object.keys(claims[itemId] ?? {}).length;
}

export function selectClaimerNames(
  claims: SessionClaims,
  itemId: string,
  participants: Record<string, SessionParticipant>
): string[] {
  return Object.keys(claims[itemId] ?? {}).map(
    (deviceId) => participants[deviceId]?.name ?? '?'
  );
}
