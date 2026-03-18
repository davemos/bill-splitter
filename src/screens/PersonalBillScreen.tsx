import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useSessionStore } from '../store/useSessionStore';
import { computePersonalBill, buildBillStateFromSession } from '../utils/sessionCalculations';
import { computeBillSummary, formatCurrency } from '../utils/calculations';
import SummaryCard from '../components/SummaryCard';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalBill'>;

export default function PersonalBillScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const isHost = useSessionStore((s) => s.isHost);
  const myDeviceId = useSessionStore((s) => s.myDeviceId);
  const items = useSessionStore((s) => s.items);
  const claims = useSessionStore((s) => s.claims);
  const extras = useSessionStore((s) => s.extras);
  const participants = useSessionStore((s) => s.participants);
  const myName = useSessionStore((s) => s.myName);
  const hostVenmo = useSessionStore((s) => s.hostVenmo);

  const myBill = useMemo(() => {
    if (!myDeviceId) return null;
    return computePersonalBill(items, claims, extras, participants, myDeviceId);
  }, [items, claims, extras, participants, myDeviceId]);

  const fullSummary = useMemo(() => {
    const state = buildBillStateFromSession({ items, claims, extras, participants });
    return computeBillSummary(state);
  }, [items, claims, extras, participants]);

  async function handlePayVenmo() {
    if (!hostVenmo || !myBill) return;
    const amount = myBill.amountOwed.toFixed(2);
    const handle = hostVenmo.replace(/^@/, '');
    const note = encodeURIComponent('Dinner split');
    const url = `venmo://paycharge?txn=pay&recipients=${handle}&amount=${amount}&note=${note}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(
        `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${note}`
      );
    }
  }

  async function handleShare() {
    const amount = myBill ? formatCurrency(myBill.amountOwed) : '$0.00';
    const text = `My share of the bill: ${amount}\n(${myName ?? 'Me'})`;
    await Share.share({ message: text });
  }

  const myClaimed = items.filter(
    (item) => myDeviceId && claims[item.id]?.[myDeviceId] === true
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.inner}>

        {/* My total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Your total</Text>
          <Text style={styles.totalAmount}>
            {myBill ? formatCurrency(myBill.amountOwed) : formatCurrency(0)}
          </Text>
          {myClaimed.length === 0 && (
            <Text style={styles.totalHint}>
              You haven't claimed any items yet. Go back and tap items to claim them.
            </Text>
          )}
        </View>

        {/* My claimed items */}
        {myClaimed.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Your items</Text>
            {myClaimed.map((item) => {
              const count = Object.keys(claims[item.id] ?? {}).length;
              const share = count > 0 ? item.price / count : item.price;
              const splitNote = count > 1 ? ` (÷${count})` : '';
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}{splitNote}</Text>
                  <Text style={styles.itemShare}>{formatCurrency(share)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Tax / tip / discount breakdown */}
        {myBill && (
          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {myBill && (
              <SummaryCard payment={myBill} />
            )}
          </View>
        )}

        {/* Host: full summary */}
        {isHost && (
          <View>
            <Text style={styles.sectionTitle}>Everyone's totals</Text>
            {fullSummary.perPerson.map((p) => (
              <View key={p.personId} style={styles.summaryRow}>
                <Text style={styles.summaryName}>{p.personName}</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(p.amountOwed)}</Text>
              </View>
            ))}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalAmount}>
                {formatCurrency(fullSummary.grandTotal)}
              </Text>
            </View>
          </View>
        )}

        {!isHost && hostVenmo && myBill && myBill.amountOwed > 0 && (
          <TouchableOpacity style={styles.venmoBtn} onPress={handlePayVenmo}>
            <Text style={styles.venmoBtnText}>Pay @{hostVenmo.replace(/^@/, '')} via Venmo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share My Total</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>← Back to Bill</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  totalCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  totalLabel: { color: COLORS.muted, fontSize: FONT_SIZE.md, marginBottom: SPACING.sm },
  totalAmount: { color: COLORS.accentLight, fontSize: 48, fontWeight: '900' },
  totalHint: {
    color: COLORS.muted, fontSize: FONT_SIZE.sm, textAlign: 'center',
    marginTop: SPACING.md, lineHeight: 20,
  },
  sectionTitle: {
    color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700',
    marginBottom: SPACING.md, marginTop: SPACING.lg,
  },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  itemName: { color: COLORS.text, fontSize: FONT_SIZE.md, flex: 1 },
  itemShare: { color: COLORS.accentLight, fontSize: FONT_SIZE.md, fontWeight: '700' },
  breakdownCard: { marginTop: SPACING.sm },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryName: { color: COLORS.text, fontSize: FONT_SIZE.md },
  summaryAmount: { color: COLORS.accentLight, fontSize: FONT_SIZE.md, fontWeight: '700' },
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: SPACING.md, marginTop: SPACING.xs,
  },
  grandTotalLabel: { color: COLORS.muted, fontSize: FONT_SIZE.md, fontWeight: '700' },
  grandTotalAmount: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '800' },
  venmoBtn: {
    backgroundColor: '#008CFF',
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  venmoBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZE.lg },
  shareBtn: {
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingVertical: SPACING.lg, alignItems: 'center',
    marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  shareBtnText: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.lg },
  backBtn: {
    borderRadius: 12, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  backBtnText: { color: COLORS.muted, fontSize: FONT_SIZE.md },
});
