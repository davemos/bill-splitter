import type {
  BillState,
  Person,
  MenuItem,
  Extras,
  SessionItem,
  SessionClaims,
  SessionExtras,
  PersonPayment,
} from '../types';
import { computeBillSummary } from './calculations';

/**
 * Converts session state into the BillState shape that computeBillSummary expects.
 * deviceId becomes Person.id; claims[itemId] keys become MenuItem.assignedTo.
 */
export function buildBillStateFromSession(params: {
  items: SessionItem[];
  claims: SessionClaims;
  extras: SessionExtras;
  participants: Record<string, { name: string; isHost: boolean; joinedAt: number }>;
}): BillState {
  const { items, claims, extras, participants } = params;

  const people: Person[] = Object.entries(participants).map(
    ([deviceId, p]) => ({ id: deviceId, name: p.name })
  );

  const menuItems: MenuItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    splitMode: 'specific',
    assignedTo: Object.keys(claims[item.id] ?? {}),
  }));

  const billExtras: Extras = {
    taxAmount: extras.taxAmount,
    tipMode: extras.tipMode,
    tipValue: extras.tipValue,
    discounts: Object.entries(extras.discounts ?? {}).map(([id, d]) => ({
      id,
      label: d.label,
      amount: d.amount,
    })),
  };

  return {
    people,
    items: menuItems,
    extras: billExtras,
    coverages: [],
    personalTips: {},
    receiptParseStatus: 'idle',
    receiptParseError: null,
  };
}

/**
 * Returns the PersonPayment for a specific participant (by deviceId).
 */
export function computePersonalBill(
  items: SessionItem[],
  claims: SessionClaims,
  extras: SessionExtras,
  participants: Record<string, { name: string; isHost: boolean; joinedAt: number }>,
  myDeviceId: string
): PersonPayment | null {
  const billState = buildBillStateFromSession({
    items,
    claims,
    extras,
    participants,
  });
  const summary = computeBillSummary(billState);
  return summary.perPerson.find((p) => p.personId === myDeviceId) ?? null;
}
