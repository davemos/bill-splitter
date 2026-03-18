import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import GlassCard from './GlassCard';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';
import { formatCurrency } from '../utils/calculations';
import type { MenuItem, Person } from '../types';

interface Props {
  item: MenuItem;
  people: Person[];
  onPress: () => void;
  onDelete: () => void;
}

export default function ItemCard({ item, people, onPress, onDelete }: Props) {
  let assigneeLabel: string;
  if (item.splitMode === 'all' || item.assignedTo.length === 0) {
    assigneeLabel = 'Split among all';
  } else {
    const names = item.assignedTo
      .map((id) => people.find((p) => p.id === id)?.name ?? '?')
      .join(', ');
    assigneeLabel = names || 'Unassigned';
  }

  return (
    <GlassCard style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.assignee}>{assigneeLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  left: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  assignee: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  price: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: SPACING.xs,
  },
  deleteIcon: {
    fontSize: 16,
  },
});
