import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useBillStore } from '../store/useBillStore';
import PersonTag from '../components/PersonTag';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPeople'>;

export default function AddPeopleScreen({ navigation }: Props) {
  const people = useBillStore((s) => s.people);
  const addPerson = useBillStore((s) => s.addPerson);
  const removePerson = useBillStore((s) => s.removePerson);
  const [nameText, setNameText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleAdd() {
    const trimmed = nameText.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate name', `"${trimmed}" is already in the list.`);
      return;
    }
    addPerson(trimmed);
    setNameText('');
    inputRef.current?.focus();
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.inner}>
          <Text style={styles.header}>Who's in?</Text>
          <Text style={styles.sub}>Add your crew 👥</Text>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Name..."
              placeholderTextColor={COLORS.muted}
              value={nameText}
              onChangeText={setNameText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.addBtn, !nameText.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!nameText.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={people}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <PersonTag name={item.name} onRemove={() => removePerson(item.id)} />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Nobody yet — add someone above 👆</Text>
            }
            contentContainerStyle={styles.list}
            numColumns={3}
            key="3col"
          />

          <TouchableOpacity
            style={[
              styles.continueBtn,
              people.length === 0 && styles.continueBtnDisabled,
            ]}
            onPress={() => navigation.navigate('AddItems')}
            disabled={people.length === 0}
          >
            <Text style={styles.continueBtnText}>
              Next: Add items → ({people.length} {people.length === 1 ? 'person' : 'people'})
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  inner: { flex: 1, padding: SPACING.xl },
  header: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sub: { color: COLORS.muted, fontSize: FONT_SIZE.md, marginBottom: SPACING.xl },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  input: {
    flex: 1,
    backgroundColor: GLASS.inputBg,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  list: { paddingBottom: SPACING.lg },
  empty: { color: COLORS.muted, fontSize: FONT_SIZE.md, marginTop: SPACING.sm },
  continueBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
});
