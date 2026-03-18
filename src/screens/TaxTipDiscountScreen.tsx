import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useBillStore } from '../store/useBillStore';
import NumericInput from '../components/NumericInput';
import GlassCard from '../components/GlassCard';
import { formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TaxTipDiscount'>;

export default function TaxTipDiscountScreen({ navigation }: Props) {
  const extras = useBillStore((s) => s.extras);
  const items = useBillStore((s) => s.items);
  const updateExtras = useBillStore((s) => s.updateExtras);
  const addDiscount = useBillStore((s) => s.addDiscount);
  const removeDiscount = useBillStore((s) => s.removeDiscount);

  const [discountLabel, setDiscountLabel] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const tipDollars =
    extras.tipMode === 'percentage'
      ? subtotal * (extras.tipValue / 100)
      : extras.tipValue;
  const tipPct =
    extras.tipMode === 'amount' && subtotal > 0
      ? (extras.tipValue / subtotal) * 100
      : extras.tipValue;

  function handleAddDiscount() {
    const label = discountLabel.trim() || 'Discount';
    if (discountAmount <= 0) return;
    addDiscount({ label, amount: discountAmount });
    setDiscountLabel('');
    setDiscountAmount(0);
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.sectionTitle}>Tax</Text>
        <NumericInput
          label="Tax Amount"
          value={extras.taxAmount}
          onChange={(v) => updateExtras({ taxAmount: v })}
          mode="currency"
        />

        <Text style={styles.sectionTitle}>Tip</Text>

        <View style={styles.tipPresets}>
          {[15, 18, 20, 25].map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[
                styles.presetBtn,
                extras.tipMode === 'percentage' && extras.tipValue === pct && styles.presetBtnActive,
              ]}
              onPress={() => updateExtras({ tipMode: 'percentage', tipValue: pct })}
            >
              <Text style={[
                styles.presetBtnText,
                extras.tipMode === 'percentage' && extras.tipValue === pct && styles.presetBtnTextActive,
              ]}>
                {pct}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard style={styles.segmented}>
          <TouchableOpacity
            style={[
              styles.segment,
              extras.tipMode === 'percentage' && styles.segmentActive,
            ]}
            onPress={() => updateExtras({ tipMode: 'percentage' })}
          >
            <Text
              style={[
                styles.segmentText,
                extras.tipMode === 'percentage' && styles.segmentTextActive,
              ]}
            >
              %
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              extras.tipMode === 'amount' && styles.segmentActive,
            ]}
            onPress={() => updateExtras({ tipMode: 'amount' })}
          >
            <Text
              style={[
                styles.segmentText,
                extras.tipMode === 'amount' && styles.segmentTextActive,
              ]}
            >
              $
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <NumericInput
          label={extras.tipMode === 'percentage' ? 'Tip Percentage' : 'Tip Amount'}
          value={extras.tipValue}
          onChange={(v) => updateExtras({ tipValue: v })}
          mode={extras.tipMode === 'percentage' ? 'percentage' : 'currency'}
          maxValue={extras.tipMode === 'percentage' ? 100 : undefined}
        />

        <GlassCard style={styles.tipPreview}>
          {extras.tipMode === 'percentage' ? (
            <Text style={styles.tipPreviewText}>
              {extras.tipValue}% of {formatCurrency(subtotal)} ={' '}
              <Text style={styles.tipPreviewAmount}>{formatCurrency(tipDollars)}</Text>
            </Text>
          ) : (
            <Text style={styles.tipPreviewText}>
              {formatCurrency(extras.tipValue)} ≈{' '}
              <Text style={styles.tipPreviewAmount}>{tipPct.toFixed(1)}%</Text>
            </Text>
          )}
        </GlassCard>

        <Text style={styles.sectionTitle}>Discounts</Text>

        {extras.discounts.map((d) => (
          <GlassCard key={d.id} style={styles.discountRow}>
            <View style={styles.discountInfo}>
              <Text style={styles.discountLabel}>{d.label}</Text>
              <Text style={styles.discountAmount}>-{formatCurrency(d.amount)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeDiscount(d.id)}
              hitSlop={8}
            >
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          </GlassCard>
        ))}

        <GlassCard style={styles.addDiscountBox}>
          <TextInput
            style={styles.discountLabelInput}
            placeholder="Label (e.g. Coupon)"
            placeholderTextColor={COLORS.muted}
            value={discountLabel}
            onChangeText={setDiscountLabel}
          />
          <NumericInput
            value={discountAmount}
            onChange={setDiscountAmount}
            mode="currency"
            placeholder="0.00"
          />
          <TouchableOpacity
            style={[styles.addDiscountBtn, discountAmount <= 0 && styles.addBtnDisabled]}
            onPress={handleAddDiscount}
            disabled={discountAmount <= 0}
          >
            <Text style={styles.addDiscountBtnText}>Add Discount</Text>
          </TouchableOpacity>
        </GlassCard>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('Coverage')}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  tipPresets: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  presetBtnText: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  presetBtnTextActive: {
    color: '#fff',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: SPACING.md,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.muted, fontWeight: '700', fontSize: FONT_SIZE.md },
  segmentTextActive: { color: '#fff' },
  tipPreview: {
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tipPreviewText: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  tipPreviewAmount: { color: COLORS.accentLight, fontWeight: '700' },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  discountInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  discountLabel: { color: COLORS.text, fontSize: FONT_SIZE.md },
  discountAmount: { color: COLORS.success, fontSize: FONT_SIZE.md, fontWeight: '700' },
  deleteIcon: { fontSize: 16, marginLeft: SPACING.md },
  addDiscountBox: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  discountLabelInput: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  addDiscountBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addDiscountBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  continueBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
});
