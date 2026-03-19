import { computeBillSummary, formatCurrency } from '../calculations';
import type { BillState } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<BillState> = {}): BillState {
  return {
    people: [],
    items: [],
    extras: { taxAmount: 0, tipMode: 'percentage', tipValue: 0, discounts: [] },
    coverages: [],
    personalTips: {},
    receiptParseStatus: 'idle',
    receiptParseError: null,
    ...overrides,
  };
}

const ALICE = { id: 'alice', name: 'Alice' };
const BOB   = { id: 'bob',   name: 'Bob'   };
const CAROL = { id: 'carol', name: 'Carol' };

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats positive amounts with two decimal places', () => {
    expect(formatCurrency(12.5)).toBe('$12.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(9.99)).toBe('$9.99');
  });

  it('formats negative amounts as positive (uses Math.abs)', () => {
    expect(formatCurrency(-5.5)).toBe('$5.50');
  });
});

// ─── Empty / edge cases ───────────────────────────────────────────────────────

describe('computeBillSummary – empty state', () => {
  it('returns all zeros when no people and no items', () => {
    const summary = computeBillSummary(makeState());
    expect(summary.subtotal).toBe(0);
    expect(summary.taxAmount).toBe(0);
    expect(summary.tipAmount).toBe(0);
    expect(summary.totalDiscount).toBe(0);
    expect(summary.grandTotal).toBe(0);
    expect(summary.perPerson).toHaveLength(0);
  });

  it('returns zero total per person when no items', () => {
    const summary = computeBillSummary(
      makeState({ people: [ALICE, BOB] })
    );
    expect(summary.perPerson).toHaveLength(2);
    summary.perPerson.forEach((p) => {
      expect(p.amountOwed).toBe(0);
      expect(p.itemShares).toHaveLength(0);
    });
  });

  it('loses tax/tip when subtotal is zero (no items to distribute against)', () => {
    // By design: distributeProportionally returns 0 for all when grandSubtotal=0
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        extras: { taxAmount: 5, tipMode: 'percentage', tipValue: 18, discounts: [] },
      })
    );
    expect(summary.perPerson[0].taxShare).toBe(0);
    expect(summary.perPerson[0].tipShare).toBe(0);
  });
});

// ─── Single person ────────────────────────────────────────────────────────────

describe('computeBillSummary – single person', () => {
  it('assigns entire item price to the only person', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Burger', price: 12, splitMode: 'all', assignedTo: [] }],
      })
    );
    expect(summary.subtotal).toBe(12);
    const alice = summary.perPerson[0];
    expect(alice.itemsSubtotal).toBe(12);
    expect(alice.amountOwed).toBe(12);
  });

  it('includes tax in the single person\'s total', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Burger', price: 20, splitMode: 'all', assignedTo: [] }],
        extras: { taxAmount: 2, tipMode: 'percentage', tipValue: 0, discounts: [] },
      })
    );
    expect(summary.perPerson[0].taxShare).toBeCloseTo(2);
    expect(summary.perPerson[0].amountOwed).toBeCloseTo(22);
  });
});

// ─── Two people, separate items ───────────────────────────────────────────────

describe('computeBillSummary – two people, separate items', () => {
  it('each person only pays for their own item', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Salad', price: 10, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 30, splitMode: 'specific', assignedTo: ['bob'] },
        ],
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.itemsSubtotal).toBe(10);
    expect(bob.itemsSubtotal).toBe(30);
    expect(alice.amountOwed).toBe(10);
    expect(bob.amountOwed).toBe(30);
    expect(summary.subtotal).toBe(40);
    expect(summary.grandTotal).toBe(40);
  });

  it('distributes tax proportionally to item subtotals', () => {
    // Alice: $10, Bob: $30 → Alice gets 25% of tax, Bob gets 75%
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Salad', price: 10, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 30, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        extras: { taxAmount: 4, tipMode: 'percentage', tipValue: 0, discounts: [] },
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.taxShare).toBeCloseTo(1); // 25% of $4
    expect(bob.taxShare).toBeCloseTo(3);   // 75% of $4
    expect(summary.taxAmount).toBe(4);
  });
});

// ─── Shared item ──────────────────────────────────────────────────────────────

describe('computeBillSummary – shared item', () => {
  it('splits a shared item equally between two people', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Pizza', price: 24, splitMode: 'specific', assignedTo: ['alice', 'bob'] },
        ],
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.itemsSubtotal).toBeCloseTo(12);
    expect(bob.itemsSubtotal).toBeCloseTo(12);
    expect(alice.itemShares[0].shareAmount).toBeCloseTo(12);
  });

  it('splits a shared item equally among three people', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB, CAROL],
        items: [
          {
            id: 'i1', name: 'Nachos', price: 30,
            splitMode: 'specific', assignedTo: ['alice', 'bob', 'carol'],
          },
        ],
      })
    );
    summary.perPerson.forEach((p) => {
      expect(p.itemsSubtotal).toBeCloseTo(10);
    });
    expect(summary.subtotal).toBeCloseTo(30);
  });
});

// ─── splitMode='all' and empty assignedTo fallback ───────────────────────────

describe('computeBillSummary – splitMode', () => {
  it('splitMode=all distributes to all people regardless of assignedTo', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Bread', price: 10, splitMode: 'all', assignedTo: [] },
        ],
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.itemsSubtotal).toBeCloseTo(5);
    expect(bob.itemsSubtotal).toBeCloseTo(5);
  });

  it('splitMode=specific with empty assignedTo falls back to all people', () => {
    // getItemAssignees: if assignedTo.length === 0 return allPeople
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Water', price: 4, splitMode: 'specific', assignedTo: [] },
        ],
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.itemsSubtotal).toBeCloseTo(2);
    expect(bob.itemsSubtotal).toBeCloseTo(2);
  });
});

// ─── Tip modes ────────────────────────────────────────────────────────────────

describe('computeBillSummary – tip', () => {
  it('calculates percentage-based tip correctly', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Burger', price: 20, splitMode: 'all', assignedTo: [] }],
        extras: { taxAmount: 0, tipMode: 'percentage', tipValue: 20, discounts: [] },
      })
    );
    expect(summary.tipAmount).toBeCloseTo(4); // 20% of $20
    expect(summary.grandTotal).toBeCloseTo(24);
  });

  it('uses fixed dollar tip amount when tipMode=amount', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Salad', price: 10, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 30, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        extras: { taxAmount: 0, tipMode: 'amount', tipValue: 8, discounts: [] },
      })
    );
    expect(summary.tipAmount).toBe(8);
    // Distributed proportionally: Alice 25%, Bob 75%
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.tipShare).toBeCloseTo(2);
    expect(bob.tipShare).toBeCloseTo(6);
  });

  it('18% tip on $100 subtotal equals $18', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Dinner', price: 100, splitMode: 'all', assignedTo: [] }],
        extras: { taxAmount: 0, tipMode: 'percentage', tipValue: 18, discounts: [] },
      })
    );
    expect(summary.tipAmount).toBeCloseTo(18);
  });
});

// ─── Discounts ────────────────────────────────────────────────────────────────

describe('computeBillSummary – discounts', () => {
  it('subtracts a single discount from each person proportionally', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Salad', price: 10, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 30, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        extras: {
          taxAmount: 0,
          tipMode: 'percentage',
          tipValue: 0,
          discounts: [{ id: 'd1', label: 'Happy Hour', amount: 8 }],
        },
      })
    );
    expect(summary.totalDiscount).toBe(8);
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    // Alice: 25% of discount = $2 off
    expect(alice.discountShare).toBeCloseTo(2);
    expect(alice.amountOwed).toBeCloseTo(8); // 10 - 2
    // Bob: 75% of discount = $6 off
    expect(bob.discountShare).toBeCloseTo(6);
    expect(bob.amountOwed).toBeCloseTo(24); // 30 - 6
  });

  it('sums multiple discounts before distributing', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Meal', price: 50, splitMode: 'all', assignedTo: [] }],
        extras: {
          taxAmount: 0,
          tipMode: 'percentage',
          tipValue: 0,
          discounts: [
            { id: 'd1', label: 'Coupon', amount: 5 },
            { id: 'd2', label: 'Member', amount: 10 },
          ],
        },
      })
    );
    expect(summary.totalDiscount).toBe(15);
    expect(summary.grandTotal).toBeCloseTo(35);
    expect(summary.perPerson[0].discountShare).toBeCloseTo(15);
    expect(summary.perPerson[0].amountOwed).toBeCloseTo(35);
  });

  it('grand total formula: subtotal + tax + tip - discount', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE],
        items: [{ id: 'i1', name: 'Meal', price: 100, splitMode: 'all', assignedTo: [] }],
        extras: {
          taxAmount: 10,
          tipMode: 'percentage',
          tipValue: 20, // $20 tip
          discounts: [{ id: 'd1', label: 'Promo', amount: 5 }],
        },
      })
    );
    // 100 + 10 + 20 - 5 = 125
    expect(summary.grandTotal).toBeCloseTo(125);
  });
});

// ─── Coverage ─────────────────────────────────────────────────────────────────

describe('computeBillSummary – coverage', () => {
  it('Bob covers Alice: Alice owes $0, Bob owes his own + Alice\'s amount', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Pasta', price: 20, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 40, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        coverages: [{ coveredPersonId: 'alice', coveringPersonId: 'bob' }],
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.amountOwed).toBe(0);
    expect(alice.coveredBy).toBe('Bob');
    expect(alice.coveredByOthers).toBe(20);
    expect(bob.amountOwed).toBe(60); // $40 own + $20 Alice's
    expect(bob.covering).toHaveLength(1);
    expect(bob.covering[0].forPersonName).toBe('Alice');
    expect(bob.covering[0].amount).toBe(20);
  });

  it('coverage does not affect total grand total', () => {
    // Coverage is a payment relationship, not a discount
    const withCoverage = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Pasta', price: 20, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 40, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        coverages: [{ coveredPersonId: 'alice', coveringPersonId: 'bob' }],
      })
    );
    const withoutCoverage = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Pasta', price: 20, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 40, splitMode: 'specific', assignedTo: ['bob'] },
        ],
      })
    );
    expect(withCoverage.grandTotal).toBe(withoutCoverage.grandTotal);

    // Sum of amountOwed should still equal grand total
    const total = withCoverage.perPerson.reduce((s, p) => s + p.amountOwed, 0);
    expect(total).toBeCloseTo(withCoverage.grandTotal);
  });
});

// ─── Personal tips ────────────────────────────────────────────────────────────

describe('computeBillSummary – personal tips', () => {
  it('adds personal tip on top of person\'s amountOwed', () => {
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB],
        items: [
          { id: 'i1', name: 'Pasta', price: 20, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'i2', name: 'Steak', price: 40, splitMode: 'specific', assignedTo: ['bob'] },
        ],
        personalTips: { alice: 5 },
      })
    );
    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    expect(alice.personalTip).toBe(5);
    expect(alice.amountOwed).toBe(25); // 20 + 5
    expect(bob.personalTip).toBe(0);
    expect(bob.amountOwed).toBe(40);
  });
});

// ─── Complex realistic scenario ───────────────────────────────────────────────

describe('computeBillSummary – realistic restaurant scenario', () => {
  it('handles full scenario: 3 people, mixed items, tax, percentage tip, discount', () => {
    /**
     * Items:
     *   Appetizer $30 → split all (Alice $10, Bob $10, Carol $10)
     *   Alice Steak $40 → Alice only
     *   Bob Pasta  $20 → Bob only
     *   Carol Salad $15 → Carol only
     * Subtotals: Alice $50, Bob $30, Carol $25 → Grand $105
     * Tax: $8.40 (8% of $105)
     * Tip: 18% of $105 = $18.90
     * Discount: $10 coupon
     * Grand: 105 + 8.40 + 18.90 - 10 = 122.30
     */
    const summary = computeBillSummary(
      makeState({
        people: [ALICE, BOB, CAROL],
        items: [
          { id: 'app', name: 'Appetizer', price: 30, splitMode: 'all', assignedTo: [] },
          { id: 'stk', name: 'Steak',     price: 40, splitMode: 'specific', assignedTo: ['alice'] },
          { id: 'pst', name: 'Pasta',     price: 20, splitMode: 'specific', assignedTo: ['bob'] },
          { id: 'sld', name: 'Salad',     price: 15, splitMode: 'specific', assignedTo: ['carol'] },
        ],
        extras: {
          taxAmount: 8.40,
          tipMode: 'percentage',
          tipValue: 18,
          discounts: [{ id: 'd1', label: 'Coupon', amount: 10 }],
        },
      })
    );

    expect(summary.subtotal).toBeCloseTo(105);
    expect(summary.taxAmount).toBeCloseTo(8.40);
    expect(summary.tipAmount).toBeCloseTo(18.9); // 18% of 105
    expect(summary.totalDiscount).toBe(10);
    expect(summary.grandTotal).toBeCloseTo(122.3);

    const alice = summary.perPerson.find((p) => p.personId === 'alice')!;
    const bob   = summary.perPerson.find((p) => p.personId === 'bob')!;
    const carol = summary.perPerson.find((p) => p.personId === 'carol')!;

    // Item subtotals
    expect(alice.itemsSubtotal).toBeCloseTo(50); // 10 (app) + 40 (steak)
    expect(bob.itemsSubtotal).toBeCloseTo(30);   // 10 (app) + 20 (pasta)
    expect(carol.itemsSubtotal).toBeCloseTo(25); // 10 (app) + 15 (salad)

    // Proportional tax (50/105, 30/105, 25/105 of $8.40)
    expect(alice.taxShare).toBeCloseTo(8.40 * (50 / 105));
    expect(bob.taxShare).toBeCloseTo(8.40 * (30 / 105));
    expect(carol.taxShare).toBeCloseTo(8.40 * (25 / 105));

    // Sum of amounts owed should ≈ grand total
    const totalOwed = alice.amountOwed + bob.amountOwed + carol.amountOwed;
    expect(totalOwed).toBeCloseTo(summary.grandTotal);
  });
});
