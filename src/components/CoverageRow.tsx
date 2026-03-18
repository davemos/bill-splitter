import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Person, CoverageAssignment } from '../types';
import { formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

interface Props {
  person: Person;
  coverage: CoverageAssignment | undefined; // existing coverage for this person
  coveringName: string | undefined; // name of who is covering this person
  personalTotal: number;
  onAssignCoverer: () => void;
  onRemoveCoverage: () => void;
}

export default function CoverageRow({
  person,
  coverage,
  coveringName,
  personalTotal,
  onAssignCoverer,
  onRemoveCoverage,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.total}>{formatCurrency(personalTotal)}</Text>
        </View>
        {coverage ? (
          <View style={styles.coveredBadge}>
            <Text style={styles.coveredText}>Covered by {coveringName}</Text>
            <TouchableOpacity onPress={onRemoveCoverage} hitSlop={8}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverBtn} onPress={onAssignCoverer}>
            <Text style={styles.coverBtnText}>Someone pays for me</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  total: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  coveredBadge: { alignItems: 'flex-end' },
  coveredText: { color: COLORS.success, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  removeText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  coverBtn: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverBtnText: { color: COLORS.muted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
