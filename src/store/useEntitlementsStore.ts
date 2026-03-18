import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FeatureId } from '../config/features';
import { loadPurchaseStatus, purchasePro, restorePurchases } from '../services/purchases';

interface EntitlementsState {
  isPro: boolean;
  isLoading: boolean;
  /** Which feature triggered the paywall (null = hidden) */
  paywallFeatureId: FeatureId | null;
  isPurchasing: boolean;
  purchaseError: string | null;
}

interface EntitlementsActions {
  /** Call once on app startup */
  loadEntitlements: () => Promise<void>;
  /** Show the paywall for a specific feature */
  showPaywall: (featureId: FeatureId) => void;
  hidePaywall: () => void;
  /** Triggers the purchase flow and updates state */
  buyPro: () => Promise<void>;
  restorePro: () => Promise<boolean>;
}

export const useEntitlementsStore = create<EntitlementsState & EntitlementsActions>()(
  immer((set, get) => ({
    isPro: false,
    isLoading: true,
    paywallFeatureId: null,
    isPurchasing: false,
    purchaseError: null,

    loadEntitlements: async () => {
      const isPro = await loadPurchaseStatus();
      set((s) => { s.isPro = isPro; s.isLoading = false; });
    },

    showPaywall: (featureId) => set((s) => {
      s.paywallFeatureId = featureId;
      s.purchaseError = null;
    }),

    hidePaywall: () => set((s) => {
      s.paywallFeatureId = null;
      s.purchaseError = null;
    }),

    buyPro: async () => {
      set((s) => { s.isPurchasing = true; s.purchaseError = null; });
      const result = await purchasePro();
      set((s) => {
        s.isPurchasing = false;
        if (result.success) {
          s.isPro = true;
          s.paywallFeatureId = null;
        } else {
          s.purchaseError = result.error ?? 'Purchase failed. Please try again.';
        }
      });
    },

    restorePro: async () => {
      set((s) => { s.isPurchasing = true; s.purchaseError = null; });
      const result = await restorePurchases();
      set((s) => {
        s.isPurchasing = false;
        if (result.restored) {
          s.isPro = true;
          s.paywallFeatureId = null;
        } else {
          s.purchaseError = 'No previous purchase found.';
        }
      });
      return result.restored;
    },
  }))
);

/** Returns true if the given feature is accessible (user is Pro). */
export function selectIsFeatureUnlocked(isPro: boolean): boolean {
  return isPro;
}
