/**
 * Purchase service — abstraction layer for in-app purchases.
 *
 * Current implementation: mock (stores state in expo-secure-store).
 * The purchase immediately succeeds so you can test the full paywall flow
 * during development.
 *
 * To integrate RevenueCat for production:
 *   1. npm install react-native-purchases (requires EAS Build / dev build)
 *   2. Replace the three functions below with:
 *      - loadPurchaseStatus  → Purchases.getCustomerInfo() and check .entitlements.active['pro']
 *      - purchasePro         → Purchases.purchaseStoreProduct(product)
 *      - restorePurchases    → Purchases.restorePurchases()
 *   3. Call Purchases.configure({ apiKey: 'your_revenuecat_key' }) in App.tsx on startup
 *
 * App Store / Google Play product ID to create: 'bill_splitter_pro'
 */
import * as SecureStore from 'expo-secure-store';

const PRO_KEY = 'bill_splitter_pro_unlocked';

/** Returns true if the user has purchased Pro. */
export async function loadPurchaseStatus(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(PRO_KEY);
  return val === 'true';
}

/** Triggers the purchase flow. Returns success/failure. */
export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  // TODO: Replace with real IAP — see instructions above.
  // For development this immediately unlocks Pro.
  try {
    await SecureStore.setItemAsync(PRO_KEY, 'true');
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Restores previous purchases (required by App Store guidelines). */
export async function restorePurchases(): Promise<{ success: boolean; restored: boolean }> {
  // TODO: Replace with RevenueCat restorePurchases().
  // In the mock, we just re-read the stored flag.
  const isPro = await loadPurchaseStatus();
  return { success: true, restored: isPro };
}

/** Dev helper — call from a debug menu to reset purchase state for testing. */
export async function _devResetPurchases(): Promise<void> {
  await SecureStore.deleteItemAsync(PRO_KEY);
}
