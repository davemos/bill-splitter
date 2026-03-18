import { useEntitlementsStore } from '../store/useEntitlementsStore';
import type { FeatureId } from '../config/features';

/**
 * Gate any Pro feature with one line:
 *
 *   const { isUnlocked, requireUnlock } = useFeatureGate('ai_receipt');
 *
 *   // Option A — guard a button press:
 *   <Button onPress={() => { if (requireUnlock()) doTheThing(); }} />
 *
 *   // Option B — conditionally render a lock badge:
 *   {!isUnlocked && <LockIcon />}
 */
export function useFeatureGate(featureId: FeatureId) {
  const isPro = useEntitlementsStore((s) => s.isPro);
  const showPaywall = useEntitlementsStore((s) => s.showPaywall);

  const isUnlocked = isPro;

  /** Call before performing a Pro action. Returns true if allowed, false + shows paywall if not. */
  function requireUnlock(): boolean {
    if (!isUnlocked) {
      showPaywall(featureId);
      return false;
    }
    return true;
  }

  return { isUnlocked, requireUnlock };
}
