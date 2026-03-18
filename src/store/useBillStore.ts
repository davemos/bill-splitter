import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  BillState,
  Person,
  MenuItem,
  Extras,
  CoverageAssignment,
  Discount,
} from '../types';

const DEFAULT_EXTRAS: Extras = {
  taxAmount: 0,
  tipMode: 'percentage',
  tipValue: 18,
  discounts: [],
};

const INITIAL_STATE: BillState = {
  people: [],
  items: [],
  extras: DEFAULT_EXTRAS,
  coverages: [],
  personalTips: {},
  receiptParseStatus: 'idle',
  receiptParseError: null,
};

let _nextId = 1;
function genId(): string {
  return String(_nextId++);
}

interface BillActions {
  // People
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;

  // Items
  addItem: (item: Omit<MenuItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<Omit<MenuItem, 'id'>>) => void;
  removeItem: (id: string) => void;
  bulkAddItems: (items: Omit<MenuItem, 'id'>[]) => void;

  // Item Assignment
  assignItemToPeople: (itemId: string, personIds: string[]) => void;
  setItemSplitMode: (itemId: string, mode: 'specific' | 'all') => void;

  // Extras
  updateExtras: (patch: Partial<Omit<Extras, 'discounts'>>) => void;
  addDiscount: (discount: Omit<Discount, 'id'>) => void;
  removeDiscount: (id: string) => void;

  // Coverage
  addCoverage: (coverage: CoverageAssignment) => void;
  removeCoverage: (coveredPersonId: string) => void;

  // Personal tips
  setPersonalTip: (personId: string, amount: number) => void;

  // Receipt parsing status
  setReceiptParseStatus: (
    status: BillState['receiptParseStatus'],
    error?: string
  ) => void;

  // Reset
  resetBill: () => void;
}

export const useBillStore = create<BillState & BillActions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    addPerson: (name) =>
      set((state) => {
        state.people.push({ id: genId(), name: name.trim() });
      }),

    removePerson: (id) =>
      set((state) => {
        state.people = state.people.filter((p) => p.id !== id);
        // Remove from item assignments
        state.items.forEach((item) => {
          item.assignedTo = item.assignedTo.filter((pid) => pid !== id);
        });
        // Remove coverages involving this person
        state.coverages = state.coverages.filter(
          (c) => c.coveredPersonId !== id && c.coveringPersonId !== id
        );
      }),

    addItem: (item) =>
      set((state) => {
        state.items.push({ ...item, id: genId() });
      }),

    updateItem: (id, patch) =>
      set((state) => {
        const item = state.items.find((i) => i.id === id);
        if (item) Object.assign(item, patch);
      }),

    removeItem: (id) =>
      set((state) => {
        state.items = state.items.filter((i) => i.id !== id);
      }),

    bulkAddItems: (items) =>
      set((state) => {
        items.forEach((item) =>
          state.items.push({ ...item, id: genId() })
        );
      }),

    assignItemToPeople: (itemId, personIds) =>
      set((state) => {
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          item.assignedTo = personIds;
          item.splitMode = 'specific';
        }
      }),

    setItemSplitMode: (itemId, mode) =>
      set((state) => {
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          item.splitMode = mode;
          if (mode === 'all') item.assignedTo = [];
        }
      }),

    updateExtras: (patch) =>
      set((state) => {
        Object.assign(state.extras, patch);
      }),

    addDiscount: (discount) =>
      set((state) => {
        state.extras.discounts.push({ ...discount, id: genId() });
      }),

    removeDiscount: (id) =>
      set((state) => {
        state.extras.discounts = state.extras.discounts.filter(
          (d) => d.id !== id
        );
      }),

    addCoverage: (coverage) =>
      set((state) => {
        const exists = state.coverages.some(
          (c) =>
            c.coveredPersonId === coverage.coveredPersonId &&
            c.coveringPersonId === coverage.coveringPersonId
        );
        if (!exists) state.coverages.push(coverage);
      }),

    removeCoverage: (coveredPersonId) =>
      set((state) => {
        state.coverages = state.coverages.filter(
          (c) => c.coveredPersonId !== coveredPersonId
        );
      }),

    setPersonalTip: (personId, amount) =>
      set((state) => {
        if (!state.personalTips) state.personalTips = {};
        state.personalTips[personId] = amount;
      }),

    setReceiptParseStatus: (status, error) =>
      set((state) => {
        state.receiptParseStatus = status;
        state.receiptParseError = error ?? null;
      }),

    resetBill: () => set(() => ({ ...INITIAL_STATE })),
  }))
);
