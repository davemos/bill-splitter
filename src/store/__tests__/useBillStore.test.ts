import { useBillStore } from '../useBillStore';

// Reset store state before each test
beforeEach(() => {
  useBillStore.getState().resetBill();
});

// ─── People ───────────────────────────────────────────────────────────────────

describe('useBillStore – people', () => {
  it('addPerson adds a person with a unique id and trimmed name', () => {
    useBillStore.getState().addPerson('  Alice  ');
    const { people } = useBillStore.getState();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Alice');
    expect(people[0].id).toBeTruthy();
  });

  it('addPerson generates unique ids for multiple people', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    const { people } = useBillStore.getState();
    expect(people).toHaveLength(2);
    expect(people[0].id).not.toBe(people[1].id);
  });

  it('removePerson removes the person by id', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    const aliceId = useBillStore.getState().people[0].id;
    useBillStore.getState().removePerson(aliceId);
    const { people } = useBillStore.getState();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Bob');
  });

  it('removePerson cleans up item assignments for removed person', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;

    useBillStore.getState().addItem({
      name: 'Pizza', price: 20,
      splitMode: 'specific', assignedTo: [aliceId, bobId],
    });
    useBillStore.getState().removePerson(aliceId);

    const items = useBillStore.getState().items;
    expect(items[0].assignedTo).toEqual([bobId]);
  });

  it('removePerson removes coverages involving that person', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;

    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    expect(useBillStore.getState().coverages).toHaveLength(1);

    useBillStore.getState().removePerson(aliceId);
    expect(useBillStore.getState().coverages).toHaveLength(0);
  });
});

// ─── Items ────────────────────────────────────────────────────────────────────

describe('useBillStore – items', () => {
  it('addItem adds an item with a generated id', () => {
    useBillStore.getState().addItem({
      name: 'Burger', price: 12, splitMode: 'all', assignedTo: [],
    });
    const { items } = useBillStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Burger');
    expect(items[0].price).toBe(12);
    expect(items[0].id).toBeTruthy();
  });

  it('updateItem patches an existing item by id', () => {
    useBillStore.getState().addItem({
      name: 'Burger', price: 12, splitMode: 'all', assignedTo: [],
    });
    const itemId = useBillStore.getState().items[0].id;
    useBillStore.getState().updateItem(itemId, { name: 'Cheeseburger', price: 14 });
    const updated = useBillStore.getState().items[0];
    expect(updated.name).toBe('Cheeseburger');
    expect(updated.price).toBe(14);
    expect(updated.splitMode).toBe('all'); // unchanged
  });

  it('updateItem does nothing for unknown id', () => {
    useBillStore.getState().addItem({
      name: 'Burger', price: 12, splitMode: 'all', assignedTo: [],
    });
    useBillStore.getState().updateItem('nonexistent', { name: 'X' });
    expect(useBillStore.getState().items[0].name).toBe('Burger');
  });

  it('removeItem removes the item by id', () => {
    useBillStore.getState().addItem({ name: 'A', price: 5, splitMode: 'all', assignedTo: [] });
    useBillStore.getState().addItem({ name: 'B', price: 10, splitMode: 'all', assignedTo: [] });
    const itemId = useBillStore.getState().items[0].id;
    useBillStore.getState().removeItem(itemId);
    const { items } = useBillStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('B');
  });

  it('bulkAddItems adds multiple items at once', () => {
    useBillStore.getState().bulkAddItems([
      { name: 'Pasta',  price: 15, splitMode: 'all', assignedTo: [] },
      { name: 'Risotto', price: 20, splitMode: 'all', assignedTo: [] },
      { name: 'Tiramisu', price: 8, splitMode: 'all', assignedTo: [] },
    ]);
    const { items } = useBillStore.getState();
    expect(items).toHaveLength(3);
    // Each has a unique id
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
  });
});

// ─── Item assignment ──────────────────────────────────────────────────────────

describe('useBillStore – item assignment', () => {
  beforeEach(() => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    useBillStore.getState().addItem({ name: 'Pizza', price: 20, splitMode: 'all', assignedTo: [] });
  });

  it('assignItemToPeople sets assignedTo and forces splitMode=specific', () => {
    const state = useBillStore.getState();
    const personIds = state.people.map((p) => p.id);
    const itemId = state.items[0].id;
    useBillStore.getState().assignItemToPeople(itemId, [personIds[0]]);
    const item = useBillStore.getState().items[0];
    expect(item.assignedTo).toEqual([personIds[0]]);
    expect(item.splitMode).toBe('specific');
  });

  it('setItemSplitMode sets mode and clears assignedTo when mode=all', () => {
    const state = useBillStore.getState();
    const itemId = state.items[0].id;
    const personId = state.people[0].id;

    // First assign to a person
    useBillStore.getState().assignItemToPeople(itemId, [personId]);
    expect(useBillStore.getState().items[0].assignedTo).toEqual([personId]);

    // Then switch to 'all'
    useBillStore.getState().setItemSplitMode(itemId, 'all');
    const item = useBillStore.getState().items[0];
    expect(item.splitMode).toBe('all');
    expect(item.assignedTo).toHaveLength(0);
  });

  it('setItemSplitMode to specific does not clear assignedTo', () => {
    const state = useBillStore.getState();
    const itemId = state.items[0].id;
    const personId = state.people[0].id;
    useBillStore.getState().assignItemToPeople(itemId, [personId]);
    useBillStore.getState().setItemSplitMode(itemId, 'specific');
    expect(useBillStore.getState().items[0].assignedTo).toEqual([personId]);
  });
});

// ─── Extras ───────────────────────────────────────────────────────────────────

describe('useBillStore – extras', () => {
  it('updateExtras patches only provided fields', () => {
    useBillStore.getState().updateExtras({ taxAmount: 5.50 });
    const { extras } = useBillStore.getState();
    expect(extras.taxAmount).toBe(5.50);
    expect(extras.tipMode).toBe('percentage'); // default unchanged
    expect(extras.tipValue).toBe(18);          // default unchanged
  });

  it('updateExtras can change tipMode to amount', () => {
    useBillStore.getState().updateExtras({ tipMode: 'amount', tipValue: 12 });
    const { extras } = useBillStore.getState();
    expect(extras.tipMode).toBe('amount');
    expect(extras.tipValue).toBe(12);
  });
});

// ─── Discounts ────────────────────────────────────────────────────────────────

describe('useBillStore – discounts', () => {
  it('addDiscount adds a discount with a generated id', () => {
    useBillStore.getState().addDiscount({ label: 'Happy Hour', amount: 5 });
    const { extras } = useBillStore.getState();
    expect(extras.discounts).toHaveLength(1);
    expect(extras.discounts[0].label).toBe('Happy Hour');
    expect(extras.discounts[0].amount).toBe(5);
    expect(extras.discounts[0].id).toBeTruthy();
  });

  it('removeDiscount removes by id', () => {
    useBillStore.getState().addDiscount({ label: 'Coupon', amount: 3 });
    useBillStore.getState().addDiscount({ label: 'Loyalty', amount: 7 });
    const discounts = useBillStore.getState().extras.discounts;
    const idToRemove = discounts[0].id;
    useBillStore.getState().removeDiscount(idToRemove);
    const remaining = useBillStore.getState().extras.discounts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe('Loyalty');
  });
});

// ─── Coverage ─────────────────────────────────────────────────────────────────

describe('useBillStore – coverage', () => {
  beforeEach(() => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
  });

  it('addCoverage adds a coverage assignment', () => {
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;
    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    expect(useBillStore.getState().coverages).toHaveLength(1);
    const c = useBillStore.getState().coverages[0];
    expect(c.coveredPersonId).toBe(aliceId);
    expect(c.coveringPersonId).toBe(bobId);
  });

  it('addCoverage does not duplicate the same assignment', () => {
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;
    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    expect(useBillStore.getState().coverages).toHaveLength(1);
  });

  it('removeCoverage removes coverage by coveredPersonId', () => {
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;
    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    useBillStore.getState().removeCoverage(aliceId);
    expect(useBillStore.getState().coverages).toHaveLength(0);
  });

  it('removeCoverage for unknown id is a no-op', () => {
    const state = useBillStore.getState();
    const aliceId = state.people[0].id;
    const bobId   = state.people[1].id;
    useBillStore.getState().addCoverage({ coveredPersonId: aliceId, coveringPersonId: bobId });
    useBillStore.getState().removeCoverage('nonexistent');
    expect(useBillStore.getState().coverages).toHaveLength(1);
  });
});

// ─── Personal tips ────────────────────────────────────────────────────────────

describe('useBillStore – personalTips', () => {
  it('setPersonalTip stores tip for a specific person', () => {
    useBillStore.getState().addPerson('Alice');
    const aliceId = useBillStore.getState().people[0].id;
    useBillStore.getState().setPersonalTip(aliceId, 3.50);
    expect(useBillStore.getState().personalTips[aliceId]).toBe(3.50);
  });

  it('setPersonalTip overwrites an existing personal tip', () => {
    useBillStore.getState().addPerson('Alice');
    const aliceId = useBillStore.getState().people[0].id;
    useBillStore.getState().setPersonalTip(aliceId, 2);
    useBillStore.getState().setPersonalTip(aliceId, 5);
    expect(useBillStore.getState().personalTips[aliceId]).toBe(5);
  });
});

// ─── Receipt parse status ─────────────────────────────────────────────────────

describe('useBillStore – receiptParseStatus', () => {
  it('sets status to loading', () => {
    useBillStore.getState().setReceiptParseStatus('loading');
    expect(useBillStore.getState().receiptParseStatus).toBe('loading');
    expect(useBillStore.getState().receiptParseError).toBeNull();
  });

  it('sets status to error with error message', () => {
    useBillStore.getState().setReceiptParseStatus('error', 'Network timeout');
    expect(useBillStore.getState().receiptParseStatus).toBe('error');
    expect(useBillStore.getState().receiptParseError).toBe('Network timeout');
  });

  it('sets status to success', () => {
    useBillStore.getState().setReceiptParseStatus('loading');
    useBillStore.getState().setReceiptParseStatus('success');
    expect(useBillStore.getState().receiptParseStatus).toBe('success');
    expect(useBillStore.getState().receiptParseError).toBeNull();
  });
});

// ─── resetBill ────────────────────────────────────────────────────────────────

describe('useBillStore – resetBill', () => {
  it('resets everything back to initial state', () => {
    // Populate state
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addItem({ name: 'Pizza', price: 20, splitMode: 'all', assignedTo: [] });
    useBillStore.getState().addDiscount({ label: 'Coupon', amount: 5 });
    useBillStore.getState().updateExtras({ taxAmount: 3, tipValue: 20 });

    useBillStore.getState().resetBill();

    const state = useBillStore.getState();
    expect(state.people).toHaveLength(0);
    expect(state.items).toHaveLength(0);
    expect(state.extras.discounts).toHaveLength(0);
    expect(state.extras.taxAmount).toBe(0);
    expect(state.extras.tipValue).toBe(18); // default tip
    expect(state.coverages).toHaveLength(0);
    expect(state.personalTips).toEqual({});
    expect(state.receiptParseStatus).toBe('idle');
    expect(state.receiptParseError).toBeNull();
  });
});
