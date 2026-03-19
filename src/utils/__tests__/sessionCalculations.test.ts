import { buildBillStateFromSession, computePersonalBill } from '../sessionCalculations';
import type { SessionItem, SessionClaims, SessionExtras } from '../../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PARTICIPANTS = {
  dev_alice: { name: 'Alice', isHost: true,  joinedAt: 1000 },
  dev_bob:   { name: 'Bob',   isHost: false, joinedAt: 1001 },
  dev_carol: { name: 'Carol', isHost: false, joinedAt: 1002 },
};

const ITEMS: SessionItem[] = [
  { id: 'item1', name: 'Burger',  price: 12, addedAt: 100, addedByDeviceId: 'dev_alice' },
  { id: 'item2', name: 'Fries',   price:  5, addedAt: 101, addedByDeviceId: 'dev_alice' },
  { id: 'item3', name: 'Shake',   price:  6, addedAt: 102, addedByDeviceId: 'dev_bob'   },
];

const EXTRAS_BASE: SessionExtras = {
  taxAmount: 0,
  tipMode: 'percentage',
  tipValue: 0,
  discounts: {},
};

// ─── buildBillStateFromSession ────────────────────────────────────────────────

describe('buildBillStateFromSession', () => {
  it('maps each participant to a Person with deviceId as id', () => {
    const state = buildBillStateFromSession({
      items: [],
      claims: {},
      extras: EXTRAS_BASE,
      participants: PARTICIPANTS,
    });
    expect(state.people).toHaveLength(3);
    const ids = state.people.map((p) => p.id);
    expect(ids).toContain('dev_alice');
    expect(ids).toContain('dev_bob');
    expect(ids).toContain('dev_carol');
    const alice = state.people.find((p) => p.id === 'dev_alice')!;
    expect(alice.name).toBe('Alice');
  });

  it('maps session items to MenuItems with splitMode=specific', () => {
    const state = buildBillStateFromSession({
      items: ITEMS,
      claims: {},
      extras: EXTRAS_BASE,
      participants: PARTICIPANTS,
    });
    expect(state.items).toHaveLength(3);
    state.items.forEach((item) => {
      expect(item.splitMode).toBe('specific');
    });
    const burger = state.items.find((i) => i.id === 'item1')!;
    expect(burger.name).toBe('Burger');
    expect(burger.price).toBe(12);
  });

  it('maps claims to assignedTo arrays', () => {
    const claims: SessionClaims = {
      item1: { dev_alice: true, dev_bob: true },
      item2: { dev_carol: true },
    };
    const state = buildBillStateFromSession({
      items: ITEMS,
      claims,
      extras: EXTRAS_BASE,
      participants: PARTICIPANTS,
    });
    const burger = state.items.find((i) => i.id === 'item1')!;
    expect(burger.assignedTo).toHaveLength(2);
    expect(burger.assignedTo).toContain('dev_alice');
    expect(burger.assignedTo).toContain('dev_bob');

    const fries = state.items.find((i) => i.id === 'item2')!;
    expect(fries.assignedTo).toEqual(['dev_carol']);
  });

  it('item with no claims has empty assignedTo (falls back to all people in billing)', () => {
    const state = buildBillStateFromSession({
      items: ITEMS,
      claims: {},
      extras: EXTRAS_BASE,
      participants: PARTICIPANTS,
    });
    state.items.forEach((item) => {
      expect(item.assignedTo).toHaveLength(0);
    });
  });

  it('maps extras: taxAmount, tipMode, tipValue', () => {
    const extras: SessionExtras = {
      taxAmount: 4.50,
      tipMode: 'amount',
      tipValue: 10,
      discounts: {},
    };
    const state = buildBillStateFromSession({
      items: [],
      claims: {},
      extras,
      participants: PARTICIPANTS,
    });
    expect(state.extras.taxAmount).toBe(4.50);
    expect(state.extras.tipMode).toBe('amount');
    expect(state.extras.tipValue).toBe(10);
  });

  it('maps discounts from Record<id, {label, amount}> to Discount[]', () => {
    const extras: SessionExtras = {
      taxAmount: 0,
      tipMode: 'percentage',
      tipValue: 0,
      discounts: {
        disc1: { label: 'Happy Hour', amount: 5 },
        disc2: { label: 'Loyalty',    amount: 3 },
      },
    };
    const state = buildBillStateFromSession({
      items: [],
      claims: {},
      extras,
      participants: {},
    });
    expect(state.extras.discounts).toHaveLength(2);
    const ids = state.extras.discounts.map((d) => d.id);
    expect(ids).toContain('disc1');
    expect(ids).toContain('disc2');
    const happy = state.extras.discounts.find((d) => d.id === 'disc1')!;
    expect(happy.label).toBe('Happy Hour');
    expect(happy.amount).toBe(5);
  });

  it('returns empty arrays for coverages and personalTips', () => {
    const state = buildBillStateFromSession({
      items: [],
      claims: {},
      extras: EXTRAS_BASE,
      participants: {},
    });
    expect(state.coverages).toHaveLength(0);
    expect(state.personalTips).toEqual({});
  });
});

// ─── computePersonalBill ──────────────────────────────────────────────────────

describe('computePersonalBill', () => {
  it('returns the PersonPayment for the given deviceId', () => {
    const claims: SessionClaims = {
      item1: { dev_alice: true },  // Alice claims Burger ($12)
      item2: { dev_bob: true },    // Bob claims Fries ($5)
      // item3 (Shake $6) has no claims → falls back to all 3 people → Alice gets $2
    };
    const bill = computePersonalBill(
      ITEMS, claims, EXTRAS_BASE, PARTICIPANTS, 'dev_alice'
    );
    expect(bill).not.toBeNull();
    expect(bill!.personId).toBe('dev_alice');
    expect(bill!.personName).toBe('Alice');
    // $12 (Burger, solo) + $6/3 (Shake, unclaimed = split all) = $14
    expect(bill!.itemsSubtotal).toBeCloseTo(14);
  });

  it('returns null for unknown deviceId', () => {
    const bill = computePersonalBill(
      ITEMS, {}, EXTRAS_BASE, PARTICIPANTS, 'dev_unknown'
    );
    expect(bill).toBeNull();
  });

  it('returns $0 when person has no claims (item falls back to all)', () => {
    // With no claims, each item has empty assignedTo → assigned to ALL people
    // So Carol also gets a share of everything
    const bill = computePersonalBill(
      ITEMS, {}, EXTRAS_BASE, PARTICIPANTS, 'dev_carol'
    );
    expect(bill).not.toBeNull();
    // Each item split among 3 people: (12 + 5 + 6) / 3 = 7.67
    expect(bill!.amountOwed).toBeCloseTo((12 + 5 + 6) / 3);
  });

  it('applies extras (tax, tip) to the individual bill', () => {
    const claims: SessionClaims = {
      item1: { dev_alice: true },
    };
    const extras: SessionExtras = {
      taxAmount: 3,
      tipMode: 'percentage',
      tipValue: 20,
      discounts: {},
    };
    // Alice claims Burger $12 only. Bob/Carol claim nothing → fall back to items 2 & 3 split among all
    // Alice total subtotal: $12 (burger, solo) + $5/3 (fries, shared) + $6/3 (shake, shared)
    const bill = computePersonalBill(
      ITEMS, claims, extras, PARTICIPANTS, 'dev_alice'
    );
    expect(bill).not.toBeNull();
    // Verify tax and tip shares are positive
    expect(bill!.taxShare).toBeGreaterThan(0);
    expect(bill!.tipShare).toBeGreaterThan(0);
  });

  it('session scenario: 3 people, each claims one item, even split', () => {
    const threeItems: SessionItem[] = [
      { id: 'a', name: 'ItemA', price: 30, addedAt: 1, addedByDeviceId: 'dev_alice' },
      { id: 'b', name: 'ItemB', price: 30, addedAt: 2, addedByDeviceId: 'dev_bob' },
      { id: 'c', name: 'ItemC', price: 30, addedAt: 3, addedByDeviceId: 'dev_carol' },
    ];
    const claims: SessionClaims = {
      a: { dev_alice: true },
      b: { dev_bob: true },
      c: { dev_carol: true },
    };
    const aliceBill = computePersonalBill(threeItems, claims, EXTRAS_BASE, PARTICIPANTS, 'dev_alice');
    const bobBill   = computePersonalBill(threeItems, claims, EXTRAS_BASE, PARTICIPANTS, 'dev_bob');
    const carolBill = computePersonalBill(threeItems, claims, EXTRAS_BASE, PARTICIPANTS, 'dev_carol');
    expect(aliceBill!.amountOwed).toBeCloseTo(30);
    expect(bobBill!.amountOwed).toBeCloseTo(30);
    expect(carolBill!.amountOwed).toBeCloseTo(30);
  });

  it('session scenario: shared item split between two claimers', () => {
    const items: SessionItem[] = [
      { id: 'pizza', name: 'Pizza', price: 24, addedAt: 1, addedByDeviceId: 'dev_alice' },
    ];
    const claims: SessionClaims = {
      pizza: { dev_alice: true, dev_bob: true },
    };
    const twoParticipants = {
      dev_alice: { name: 'Alice', isHost: true,  joinedAt: 1 },
      dev_bob:   { name: 'Bob',   isHost: false, joinedAt: 2 },
    };
    const aliceBill = computePersonalBill(items, claims, EXTRAS_BASE, twoParticipants, 'dev_alice');
    const bobBill   = computePersonalBill(items, claims, EXTRAS_BASE, twoParticipants, 'dev_bob');
    expect(aliceBill!.amountOwed).toBeCloseTo(12);
    expect(bobBill!.amountOwed).toBeCloseTo(12);
  });
});
