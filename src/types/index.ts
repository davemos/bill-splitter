// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
}

export type SplitMode = 'specific' | 'all';

export interface MenuItem {
  id: string;
  name: string;
  price: number; // dollar amount, e.g. 12.50
  splitMode: SplitMode;
  assignedTo: string[]; // Person.id array; ignored when splitMode='all'
}

export interface Discount {
  id: string;
  label: string;
  amount: number; // positive dollar amount to subtract
}

export interface Extras {
  taxAmount: number;
  tipMode: 'percentage' | 'amount';
  tipValue: number; // percentage (e.g. 18) or dollar amount
  discounts: Discount[];
}

// Person A covering Person B means A pays B's total share
export interface CoverageAssignment {
  coveredPersonId: string; // whose share is being paid for
  coveringPersonId: string; // who is paying it
}

export interface BillState {
  people: Person[];
  items: MenuItem[];
  extras: Extras;
  coverages: CoverageAssignment[];
  personalTips: Record<string, number>; // personId → extra tip amount
  receiptParseStatus: 'idle' | 'loading' | 'success' | 'error';
  receiptParseError: string | null;
}

// ─── Computed / Output Types ──────────────────────────────────────────────────

export interface PersonItemShare {
  itemId: string;
  itemName: string;
  shareAmount: number;
}

export interface PersonConsumption {
  personId: string;
  personName: string;
  itemShares: PersonItemShare[];
  subtotal: number;
  taxShare: number;
  tipShare: number;
  discountShare: number;
  total: number;
}

export interface CoveredDetail {
  forPersonId: string;
  forPersonName: string;
  amount: number;
}

export interface PersonPayment {
  personId: string;
  personName: string;
  itemShares: PersonItemShare[];
  itemsSubtotal: number;
  taxShare: number;
  tipShare: number;
  discountShare: number;
  consumptionTotal: number;
  personalTip: number;
  coveredByOthers: number; // amount someone else is paying for this person
  coveredBy: string | null; // name of person covering this person
  covering: CoveredDetail[]; // amounts this person is paying for others
  amountOwed: number; // final amount this person pays
}

export interface BillSummary {
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalDiscount: number;
  grandTotal: number;
  perPerson: PersonPayment[];
}

// ─── Claude API ───────────────────────────────────────────────────────────────

export interface ParsedReceiptItem {
  name: string;
  price: number;
}

export interface ParsedReceipt {
  items: ParsedReceiptItem[];
  subtotal: number | null;
  taxAmount: number | null;
  tipAmount: number | null;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  // Solo flow
  Home: undefined;
  AddPeople: undefined;
  AddItems: undefined;
  ItemAssignment: { itemId: string };
  TaxTipDiscount: undefined;
  Coverage: undefined;
  Summary: undefined;
  // Multiplayer flow
  SessionEntry: undefined;
  Lobby: { sessionId: string };
  SharedBill: { sessionId: string };
  PersonalBill: { sessionId: string };
  // Auth & profile
  Login: undefined;
  Profile: undefined;
  Wallet: undefined;
};

// ─── User Profile & Wallet ─────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nickname?: string;
  avatarColor: string;
  createdAt: number;
}

/** Returns nickname if set, otherwise "FirstName L." format. */
export function getPreferredName(profile: UserProfile): string {
  if (profile.nickname?.trim()) return profile.nickname.trim();
  const parts = profile.displayName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export interface WalletCard {
  id: string;
  label: string;
  cardType: CardType;
  last4: string;        // last 4 digits ONLY — never store full number
  expiryMonth: string;  // "01"–"12"
  expiryYear: string;   // "25", "26", etc.
  cardholderName: string;
}

export type PaymentLinkType = 'venmo' | 'paypal' | 'cashapp';

export interface WalletPaymentLink {
  id: string;
  type: PaymentLinkType;
  handle: string; // @username, email, or $cashtag
}

export interface UserWallet {
  cards: WalletCard[];
  paymentLinks: WalletPaymentLink[];
}

// ─── Multiplayer Session ──────────────────────────────────────────────────────

export type SessionStatus = 'lobby' | 'open' | 'closed';

export interface SessionParticipant {
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface SessionItem {
  id: string; // Firebase push key
  name: string;
  price: number;
  addedAt: number;
  addedByDeviceId: string;
}

// { [itemId]: { [deviceId]: true } }
export type SessionClaims = Record<string, Record<string, boolean>>;

export interface SessionExtras {
  taxAmount: number;
  tipMode: 'percentage' | 'amount';
  tipValue: number;
  discounts: Record<string, { label: string; amount: number }>;
}

export interface SessionMeta {
  code: string;
  hostDeviceId: string;
  hostVenmo?: string;
  createdAt: number;
  status: SessionStatus;
}

export interface LocalSessionState {
  sessionId: string | null;
  sessionCode: string | null;
  myDeviceId: string | null;
  myName: string | null;
  isHost: boolean;
  hostVenmo: string | null;
  status: SessionStatus;
  participants: Record<string, SessionParticipant>;
  items: SessionItem[];
  claims: SessionClaims;
  extras: SessionExtras;
  syncStatus: 'idle' | 'connecting' | 'synced' | 'error';
  syncError: string | null;
}
