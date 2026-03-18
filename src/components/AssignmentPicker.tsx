import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Person } from '../types';
import PersonTag from './PersonTag';
import { SPACING } from '../utils/theme';

interface Props {
  people: Person[];
  selectedIds: string[];
  onToggle: (personId: string) => void;
}

export default function AssignmentPicker({
  people,
  selectedIds,
  onToggle,
}: Props) {
  return (
    <View style={styles.wrap}>
      {people.map((p) => (
        <PersonTag
          key={p.id}
          name={p.name}
          selected={selectedIds.includes(p.id)}
          onPress={() => onToggle(p.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
});
