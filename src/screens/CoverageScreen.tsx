import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Person } from '../types';
import { useBillStore } from '../store/useBillStore';
import CoverageRow from '../components/CoverageRow';
import { computeBillSummary } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Coverage'>;

export default function CoverageScreen({ navigation }: Props) {
  const people = useBillStore((s) => s.people);
  const coverages = useBillStore((s) => s.coverages);
  const addCoverage = useBillStore((s) => s.addCoverage);
  const removeCoverage = useBillStore((s) => s.removeCoverage);
  const billState = useBillStore();

  const summary = useMemo(() => computeBillSummary(billState), [billState]);

  // Modal state: which person needs a coverer picked
  const [pickingCovererFor, setPickingCovererFor] = useState<Person | null>(null);

  function getPersonTotal(personId: string): number {
    return (
      summary.perPerson.find((p) => p.personId === personId)?.consumptionTotal ?? 0
    );
  }

  function handleAssignCoverer(coveredPerson: Person, coveringPerson: Person) {
    // Prevent circular coverage
    const wouldCircle = coverages.some(
      (c) =>
        c.coveringPersonId === coveredPerson.id &&
        c.coveredPersonId === coveringPerson.id
    );
    if (!wouldCircle) {
      addCoverage({
        coveredPersonId: coveredPerson.id,
        coveringPersonId: coveringPerson.id,
      });
    }
    setPickingCovererFor(null);
  }

  // Available coverers: not self, not already covering this person's covered person (circular check)
  function availableCoverers(coveredPerson: Person): Person[] {
    return people.filter((p) => {
      if (p.id === coveredPerson.id) return false;
      // Would create circle: p already covered by coveredPerson
      const wouldCircle = coverages.some(
        (c) =>
          c.coveringPersonId === coveredPerson.id && c.coveredPersonId === p.id
      );
      return !wouldCircle;
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        renderItem={({ item: person }) => {
          const coverage = coverages.find(
            (c) => c.coveredPersonId === person.id
          );
          const coveringPerson = coverage
            ? people.find((p) => p.id === coverage.coveringPersonId)
            : undefined;

          return (
            <CoverageRow
              person={person}
              coverage={coverage}
              coveringName={coveringPerson?.name}
              personalTotal={getPersonTotal(person.id)}
              onAssignCoverer={() => setPickingCovererFor(person)}
              onRemoveCoverage={() => removeCoverage(person.id)}
            />
          );
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Who's covering who?</Text>
            <Text style={styles.sub}>
              If someone is paying for another person's meal, set it up here.
              This is optional.
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('Summary')}
          >
            <Text style={styles.continueBtnText}>See Summary</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.list}
      />

      {/* Coverer picker modal */}
      <Modal
        visible={!!pickingCovererFor}
        transparent
        animationType="slide"
        onRequestClose={() => setPickingCovererFor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Who pays for {pickingCovererFor?.name}?
            </Text>
            {pickingCovererFor &&
              availableCoverers(pickingCovererFor).map((coverer) => (
                <TouchableOpacity
                  key={coverer.id}
                  style={styles.covererOption}
                  onPress={() =>
                    handleAssignCoverer(pickingCovererFor, coverer)
                  }
                >
                  <Text style={styles.covererName}>{coverer.name}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPickingCovererFor(null)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  header: { marginBottom: SPACING.xl },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sub: { color: COLORS.muted, fontSize: FONT_SIZE.md, lineHeight: 22 },
  continueBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  covererOption: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  covererName: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  cancelBtn: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.muted, fontSize: FONT_SIZE.md },
});
