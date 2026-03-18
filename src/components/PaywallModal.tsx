import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { PRO_FEATURES, FEATURE_MAP } from '../config/features';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

// Price shown to the user — update when you create the product in App Store Connect / Play Console
const PRO_PRICE = '$4.99';

export default function PaywallModal() {
  const paywallFeatureId = useEntitlementsStore((s) => s.paywallFeatureId);
  const isPurchasing = useEntitlementsStore((s) => s.isPurchasing);
  const purchaseError = useEntitlementsStore((s) => s.purchaseError);
  const hidePaywall = useEntitlementsStore((s) => s.hidePaywall);
  const buyPro = useEntitlementsStore((s) => s.buyPro);
  const restorePro = useEntitlementsStore((s) => s.restorePro);

  const feature = paywallFeatureId ? FEATURE_MAP[paywallFeatureId] : null;
  const visible = paywallFeatureId !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hidePaywall}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Dismiss */}
          <TouchableOpacity style={styles.closeBtn} onPress={hidePaywall} hitSlop={12}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          {/* Featured capability */}
          {feature && (
            <View style={styles.featureHero}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.name}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
          )}

          {/* Pro badge */}
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>Bill Splitter Pro</Text>
          </View>

          {/* Feature list */}
          <View style={styles.featureList}>
            <Text style={styles.featureListTitle}>Everything in Pro:</Text>
            {PRO_FEATURES.map((f) => (
              <View key={f.id} style={styles.featureRow}>
                <Text style={styles.featureRowIcon}>{f.icon}</Text>
                <Text style={styles.featureRowName}>{f.name}</Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {purchaseError && (
            <Text style={styles.errorText}>{purchaseError}</Text>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.buyBtn, isPurchasing && styles.buyBtnDisabled]}
            onPress={buyPro}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyBtnText}>Unlock Pro — {PRO_PRICE}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={restorePro}
            disabled={isPurchasing}
          >
            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.sm,
    zIndex: 1,
  },
  closeIcon: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: '600',
  },
  featureHero: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  featureIcon: {
    fontSize: 52,
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  featureDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  proBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  proBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZE.sm,
    letterSpacing: 0.5,
  },
  featureList: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  featureListTitle: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  featureRowIcon: { fontSize: 18 },
  featureRowName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  errorText: {
    color: '#e05252',
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  buyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FONT_SIZE.lg,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  restoreBtnText: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'underline',
  },
});
