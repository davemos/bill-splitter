import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useBillStore } from '../store/useBillStore';
import SummaryCard from '../components/SummaryCard';
import GlassCard from '../components/GlassCard';
import { computeBillSummary, formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

export default function SummaryScreen({ navigation }: Props) {
  const billState = useBillStore();
  const resetBill = useBillStore((s) => s.resetBill);
  const setPersonalTip = useBillStore((s) => s.setPersonalTip);

  const summary = useMemo(() => computeBillSummary(billState), [billState]);

  async function handleShare() {
    const lines = summary.perPerson
      .map((p) => `${p.personName} → ${formatCurrency(p.amountOwed)}`)
      .join('\n');
    const text = `💸 Here's the split\n──────────────\n${lines}\n──────────────\nTotal: ${formatCurrency(summary.grandTotal)}\nvia Splitr 🍕`;
    await Share.share({ message: text });
  }

  function handleNewBill() {
    resetBill();
    navigation.popToTop();
  }

  const totalsData = [
    { label: 'Subtotal', value: summary.subtotal },
    { label: 'Tax', value: summary.taxAmount },
    { label: 'Tip', value: summary.tipAmount },
    ...(summary.totalDiscount > 0
      ? [{ label: 'Discount', value: -summary.totalDiscount }]
      : []),
    { label: 'Grand Total', value: summary.grandTotal, bold: true },
  ];

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={summary.perPerson}
        keyExtractor={(p) => p.personId}
        renderItem={({ item }) => (
          <SummaryCard
            payment={item}
            onSetPersonalTip={(amount) => setPersonalTip(item.personId, amount)}
          />
        )}
        ListHeaderComponent={
          <View>
            <GlassCard style={styles.totalsCard}>
              {totalsData.map((row) => (
                <View key={row.label} style={styles.totalsRow}>
                  <Text
                    style={[styles.totalsLabel, row.bold && styles.totalsBold]}
                  >
                    {row.label}
                  </Text>
                  <Text
                    style={[
                      styles.totalsValue,
                      row.bold && styles.totalsBoldValue,
                      row.value < 0 && { color: COLORS.success },
                    ]}
                  >
                    {row.value < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(row.value))}
                  </Text>
                </View>
              ))}
            </GlassCard>
            <Text style={styles.perPersonHeader}>Each person owes</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <GlassCard style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>Share 💸</Text>
            </GlassCard>
            <TouchableOpacity
              style={styles.newBillBtn}
              onPress={handleNewBill}
            >
              <Text style={styles.newBillBtnText}>New split</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: SPACING.xl },
  totalsCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  totalsLabel: { color: COLORS.muted, fontSize: FONT_SIZE.md },
  totalsBold: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.lg },
  totalsValue: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  totalsBoldValue: {
    color: COLORS.accentLight,
    fontWeight: '800',
    fontSize: FONT_SIZE.xl,
  },
  perPersonHeader: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  footer: { gap: SPACING.md, marginTop: SPACING.md },
  shareBtn: {
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  shareBtnText: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.lg },
  newBillBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  newBillBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
});
