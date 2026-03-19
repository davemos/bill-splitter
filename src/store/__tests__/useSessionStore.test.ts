import {
  useSessionStore,
  selectMyClaimedItemIds,
  selectClaimCount,
  selectClaimerNames,
} from '../useSessionStore';
import type { SessionClaims, SessionExtras } from '../../types';

// Reset session store state before each test
beforeEach(() => {
  useSessionStore.getState().resetSession();
});

const BASE_EXTRAS: SessionExtras = {
  taxAmount: 0,
  tipMode: 'percentage',
  tipValue: 18,
  discounts: {},
};

// ─── setSession ───────────────────────────────────────────────────────────────

describe('useSessionStore – setSession', () => {
  it('populates all session fields and sets syncStatus to connecting', () => {
    useSessionStore.getState().setSession({
      sessionId: 'sess_123',
      sessionCode: 'ABCDEF',
      myDeviceId: 'dev_alice',
      myName: 'Alice',
      isHost: true,
    });
    const state = useSessionStore.getState();
    expect(state.sessionId).toBe('sess_123');
    expect(state.sessionCode).toBe('ABCDEF');
    expect(state.myDeviceId).toBe('dev_alice');
    expect(state.myName).toBe('Alice');
    expect(state.isHost).toBe(true);
    expect(state.syncStatus).toBe('connecting');
  });

  it('isHost=false for guest session', () => {
    useSessionStore.getState().setSession({
      sessionId: 'sess_456',
      sessionCode: 'ZZZYYY',
      myDeviceId: 'dev_bob',
      myName: 'Bob',
      isHost: false,
    });
    expect(useSessionStore.getState().isHost).toBe(false);
  });
});

// ─── setStatus ────────────────────────────────────────────────────────────────

describe('useSessionStore – setStatus', () => {
  it('updates session status to open', () => {
    useSessionStore.getState().setStatus('open');
    expect(useSessionStore.getState().status).toBe('open');
  });

  it('updates session status to closed', () => {
    useSessionStore.getState().setStatus('open');
    useSessionStore.getState().setStatus('closed');
    expect(useSessionStore.getState().status).toBe('closed');
  });

  it('updates session status back to lobby', () => {
    useSessionStore.getState().setStatus('open');
    useSessionStore.getState().setStatus('lobby');
    expect(useSessionStore.getState().status).toBe('lobby');
  });
});

// ─── setParticipants ──────────────────────────────────────────────────────────

describe('useSessionStore – setParticipants', () => {
  it('replaces participants record', () => {
    useSessionStore.getState().setParticipants({
      dev_alice: { name: 'Alice', isHost: true,  joinedAt: 1000 },
      dev_bob:   { name: 'Bob',   isHost: false, joinedAt: 1001 },
    });
    const { participants } = useSessionStore.getState();
    expect(Object.keys(participants)).toHaveLength(2);
    expect(participants['dev_alice'].name).toBe('Alice');
    expect(participants['dev_bob'].isHost).toBe(false);
  });

  it('setParticipants with empty object clears participants', () => {
    useSessionStore.getState().setParticipants({
      dev_alice: { name: 'Alice', isHost: true, joinedAt: 1000 },
    });
    useSessionStore.getState().setParticipants({});
    expect(Object.keys(useSessionStore.getState().participants)).toHaveLength(0);
  });
});

// ─── setItems ─────────────────────────────────────────────────────────────────

describe('useSessionStore – setItems', () => {
  it('replaces the items array', () => {
    useSessionStore.getState().setItems([
      { id: 'item1', name: 'Burger', price: 12, addedAt: 100, addedByDeviceId: 'dev_alice' },
      { id: 'item2', name: 'Fries',  price:  5, addedAt: 101, addedByDeviceId: 'dev_alice' },
    ]);
    const { items } = useSessionStore.getState();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Burger');
    expect(items[1].price).toBe(5);
  });

  it('setItems with empty array clears items', () => {
    useSessionStore.getState().setItems([
      { id: 'item1', name: 'Burger', price: 12, addedAt: 100, addedByDeviceId: 'dev_alice' },
    ]);
    useSessionStore.getState().setItems([]);
    expect(useSessionStore.getState().items).toHaveLength(0);
  });
});

// ─── setClaims ────────────────────────────────────────────────────────────────

describe('useSessionStore – setClaims', () => {
  it('replaces claims', () => {
    const claims: SessionClaims = {
      item1: { dev_alice: true, dev_bob: true },
      item2: { dev_carol: true },
    };
    useSessionStore.getState().setClaims(claims);
    const { claims: stored } = useSessionStore.getState();
    expect(stored['item1']['dev_alice']).toBe(true);
    expect(stored['item2']['dev_carol']).toBe(true);
  });
});

// ─── setExtras ────────────────────────────────────────────────────────────────

describe('useSessionStore – setExtras', () => {
  it('replaces all extras', () => {
    const extras: SessionExtras = {
      taxAmount: 8.50,
      tipMode: 'amount',
      tipValue: 15,
      discounts: { d1: { label: 'Happy Hour', amount: 5 } },
    };
    useSessionStore.getState().setExtras(extras);
    const { extras: stored } = useSessionStore.getState();
    expect(stored.taxAmount).toBe(8.50);
    expect(stored.tipMode).toBe('amount');
    expect(stored.tipValue).toBe(15);
    expect(stored.discounts['d1'].label).toBe('Happy Hour');
  });
});

// ─── setHostVenmo ─────────────────────────────────────────────────────────────

describe('useSessionStore – setHostVenmo', () => {
  it('sets the host Venmo handle', () => {
    useSessionStore.getState().setHostVenmo('@alice_pays');
    expect(useSessionStore.getState().hostVenmo).toBe('@alice_pays');
  });

  it('clears Venmo handle when set to null', () => {
    useSessionStore.getState().setHostVenmo('@alice_pays');
    useSessionStore.getState().setHostVenmo(null);
    expect(useSessionStore.getState().hostVenmo).toBeNull();
  });
});

// ─── setSyncStatus ────────────────────────────────────────────────────────────

describe('useSessionStore – setSyncStatus', () => {
  it('sets status to synced with no error', () => {
    useSessionStore.getState().setSyncStatus('synced');
    expect(useSessionStore.getState().syncStatus).toBe('synced');
    expect(useSessionStore.getState().syncError).toBeNull();
  });

  it('sets status to error with error message', () => {
    useSessionStore.getState().setSyncStatus('error', 'Connection refused');
    expect(useSessionStore.getState().syncStatus).toBe('error');
    expect(useSessionStore.getState().syncError).toBe('Connection refused');
  });

  it('clears error when moving to non-error status', () => {
    useSessionStore.getState().setSyncStatus('error', 'oops');
    useSessionStore.getState().setSyncStatus('synced');
    expect(useSessionStore.getState().syncError).toBeNull();
  });
});

// ─── resetSession ─────────────────────────────────────────────────────────────

describe('useSessionStore – resetSession', () => {
  it('clears all session state back to initial values', () => {
    // Populate state
    useSessionStore.getState().setSession({
      sessionId: 'sess_abc',
      sessionCode: 'XYZ123',
      myDeviceId: 'dev_alice',
      myName: 'Alice',
      isHost: true,
    });
    useSessionStore.getState().setStatus('open');
    useSessionStore.getState().setParticipants({
      dev_alice: { name: 'Alice', isHost: true, joinedAt: 1000 },
    });
    useSessionStore.getState().setItems([
      { id: 'item1', name: 'Burger', price: 12, addedAt: 100, addedByDeviceId: 'dev_alice' },
    ]);
    useSessionStore.getState().setClaims({ item1: { dev_alice: true } });
    useSessionStore.getState().setHostVenmo('@alice');

    useSessionStore.getState().resetSession();

    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.sessionCode).toBeNull();
    expect(state.myDeviceId).toBeNull();
    expect(state.myName).toBeNull();
    expect(state.isHost).toBe(false);
    expect(state.hostVenmo).toBeNull();
    expect(state.status).toBe('lobby');
    expect(state.participants).toEqual({});
    expect(state.items).toHaveLength(0);
    expect(state.claims).toEqual({});
    expect(state.syncStatus).toBe('idle');
    expect(state.syncError).toBeNull();
  });
});

// ─── selectMyClaimedItemIds ───────────────────────────────────────────────────

describe('selectMyClaimedItemIds', () => {
  const claims: SessionClaims = {
    item1: { dev_alice: true, dev_bob: true },
    item2: { dev_alice: true },
    item3: { dev_bob: true },
    item4: {},
  };

  it('returns item ids claimed by the given deviceId', () => {
    const aliceClaimed = selectMyClaimedItemIds(claims, 'dev_alice');
    expect(aliceClaimed).toHaveLength(2);
    expect(aliceClaimed).toContain('item1');
    expect(aliceClaimed).toContain('item2');
  });

  it('returns only items claimed by the specific device (not others)', () => {
    const bobClaimed = selectMyClaimedItemIds(claims, 'dev_bob');
    expect(bobClaimed).toContain('item1');
    expect(bobClaimed).toContain('item3');
    expect(bobClaimed).not.toContain('item2');
  });

  it('returns empty array for null deviceId', () => {
    expect(selectMyClaimedItemIds(claims, null)).toHaveLength(0);
  });

  it('returns empty array for device with no claims', () => {
    expect(selectMyClaimedItemIds(claims, 'dev_carol')).toHaveLength(0);
  });

  it('returns empty array for empty claims object', () => {
    expect(selectMyClaimedItemIds({}, 'dev_alice')).toHaveLength(0);
  });
});

// ─── selectClaimCount ─────────────────────────────────────────────────────────

describe('selectClaimCount', () => {
  const claims: SessionClaims = {
    item1: { dev_alice: true, dev_bob: true, dev_carol: true },
    item2: { dev_alice: true },
    item3: {},
  };

  it('returns the number of claimers for an item with multiple claims', () => {
    expect(selectClaimCount(claims, 'item1')).toBe(3);
  });

  it('returns 1 for an item with a single claimer', () => {
    expect(selectClaimCount(claims, 'item2')).toBe(1);
  });

  it('returns 0 for an item with no claimers', () => {
    expect(selectClaimCount(claims, 'item3')).toBe(0);
  });

  it('returns 0 for an item id not in claims', () => {
    expect(selectClaimCount(claims, 'nonexistent')).toBe(0);
  });
});

// ─── selectClaimerNames ───────────────────────────────────────────────────────

describe('selectClaimerNames', () => {
  const participants = {
    dev_alice: { name: 'Alice', isHost: true,  joinedAt: 1000 },
    dev_bob:   { name: 'Bob',   isHost: false, joinedAt: 1001 },
    dev_carol: { name: 'Carol', isHost: false, joinedAt: 1002 },
  };

  const claims: SessionClaims = {
    item1: { dev_alice: true, dev_bob: true },
    item2: { dev_carol: true },
  };

  it('returns names of all claimers for an item', () => {
    const names = selectClaimerNames(claims, 'item1', participants);
    expect(names).toHaveLength(2);
    expect(names).toContain('Alice');
    expect(names).toContain('Bob');
  });

  it('returns single name for item with one claimer', () => {
    const names = selectClaimerNames(claims, 'item2', participants);
    expect(names).toEqual(['Carol']);
  });

  it('returns empty array for item with no claims', () => {
    const names = selectClaimerNames(claims, 'item3', participants);
    expect(names).toHaveLength(0);
  });

  it('returns "?" for unknown device id in claims', () => {
    const claimsWithUnknown: SessionClaims = {
      item1: { dev_ghost: true },
    };
    const names = selectClaimerNames(claimsWithUnknown, 'item1', participants);
    expect(names).toEqual(['?']);
  });
});
