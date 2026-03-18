import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useBillStore } from '../store/useBillStore';
import AssignmentPicker from '../components/AssignmentPicker';
import NumericInput from '../components/NumericInput';
import { formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemAssignment'>;

export default function ItemAssignmentScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const people = useBillStore((s) => s.people);
  const item = useBillStore((s) => s.items.find((i) => i.id === itemId));
  const setItemSplitMode = useBillStore((s) => s.setItemSplitMode);
  const assignItemToPeople = useBillStore((s) => s.assignItemToPeople);
  const updateItem = useBillStore((s) => s.updateItem);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    item?.assignedTo ?? []
  );

  if (!item) return null;

  const isAllMode = item.splitMode === 'all';

  function togglePerson(personId: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId];
      assignItemToPeople(itemId, next);
      return next;
    });
  }

  function handleSplitModeChange(value: boolean) {
    // value=true means "all", value=false means "specific"
    if (value) {
      setItemSplitMode(itemId, 'all');
      setSelectedIds([]);
    } else {
      setItemSplitMode(itemId, 'specific');
    }
  }

  const effectiveAssignees =
    isAllMode || selectedIds.length === 0 ? people.length : selectedIds.length;
  const sharePerPerson =
    effectiveAssignees > 0 ? item.price / effectiveAssignees : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.itemName}>{item.name}</Text>

        <NumericInput
          label="Price"
          value={item.price}
          onChange={(v) => updateItem(itemId, { price: v })}
          mode="currency"
        />

        <View style={styles.row}>
          <Text style={styles.switchLabel}>Split among all diners</Text>
          <Switch
            value={isAllMode}
            onValueChange={handleSplitModeChange}
            trackColor={{ true: COLORS.accent }}
            thumbColor="#fff"
          />
        </View>

        {!isAllMode && (
          <>
            <Text style={styles.sectionLabel}>Select people</Text>
            <AssignmentPicker
              people={people}
              selectedIds={selectedIds}
              onToggle={togglePerson}
            />
          </>
        )}

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Each person pays</Text>
          <Text style={styles.previewAmount}>{formatCurrency(sharePerPerson)}</Text>
          <Text style={styles.previewSub}>
            {formatCurrency(item.price)} ÷ {effectiveAssignees}{' '}
            {effectiveAssignees === 1 ? 'person' : 'people'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: SPACING.xl },
  itemName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchLabel: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  preview: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewLabel: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  previewAmount: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  previewSub: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  doneBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
});
