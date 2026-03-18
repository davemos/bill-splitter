import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import GlassCard from './GlassCard';
import type { PersonPayment } from '../types';
import { formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

interface Props {
  payment: PersonPayment;
  onSetPersonalTip?: (amount: number) => void;
}

export default function SummaryCard({ payment, onSetPersonalTip }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tipText, setTipText] = useState(
    payment.personalTip > 0 ? payment.personalTip.toFixed(2) : ''
  );

  const isCovered = payment.coveredByOthers > 0;
  const isCovering = payment.covering.length > 0;

  function handleTipBlur() {
    const val = parseFloat(tipText) || 0;
    onSetPersonalTip?.(val);
    setTipText(val > 0 ? val.toFixed(2) : '');
  }

  return (
    <GlassCard style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{payment.personName}</Text>
          {isCovered && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Covered</Text>
            </View>
          )}
        </View>
        <View style={styles.rightWrap}>
          <Text style={styles.amount}>{formatCurrency(payment.amountOwed)}</Text>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          {payment.itemShares.map((share) => (
            <Row
              key={share.itemId}
              label={share.itemName}
              amount={share.shareAmount}
            />
          ))}

          <View style={styles.divider} />

          <Row label="Subtotal" amount={payment.itemsSubtotal} />
          {payment.taxShare > 0 && (
            <Row label="Tax" amount={payment.taxShare} />
          )}
          {payment.tipShare > 0 && (
            <Row label="Shared tip" amount={payment.tipShare} />
          )}
          {payment.discountShare > 0 && (
            <Row
              label="Discount"
              amount={-payment.discountShare}
              color={COLORS.success}
            />
          )}

          {/* Extra tip input */}
          <View style={styles.row}>
            <Text style={styles.rowText}>Extra tip</Text>
            <View style={styles.tipInputWrap}>
              <Text style={styles.rowText}>$</Text>
              <TextInput
                style={styles.tipInput}
                value={tipText}
                onChangeText={setTipText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.muted}
                onBlur={handleTipBlur}
                returnKeyType="done"
                onSubmitEditing={handleTipBlur}
              />
            </View>
          </View>

          {isCovered && payment.coveredBy && (
            <Row
              label={`Covered by ${payment.coveredBy}`}
              amount={-payment.coveredByOthers}
              color={COLORS.success}
            />
          )}

          {isCovering &&
            payment.covering.map((c) => (
              <Row
                key={c.forPersonId}
                label={`Covering ${c.forPersonName}`}
                amount={c.amount}
                color={COLORS.warning}
              />
            ))}

          <View style={styles.divider} />
          <Row
            label="Total owed"
            amount={payment.amountOwed}
            bold
            color={COLORS.accentLight}
          />
        </View>
      )}
    </GlassCard>
  );
}

function Row({
  label,
  amount,
  bold,
  color,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  color?: string;
}) {
  const textStyle = [
    styles.rowText,
    bold && styles.bold,
    color ? { color } : undefined,
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      <Text style={textStyle as any}>{label}</Text>
      <Text style={textStyle as any}>
        {amount < 0 ? '-' : ''}
        {formatCurrency(Math.abs(amount))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  name: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  amount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.accentLight,
  },
  chevron: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  details: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  rowText: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  bold: { fontWeight: '700', fontSize: FONT_SIZE.md },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: SPACING.sm,
  },
  tipInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tipInput: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    minWidth: 52,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 2,
  },
});
