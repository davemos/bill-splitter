import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useBillStore } from '../store/useBillStore';
import ItemCard from '../components/ItemCard';
import ReceiptParser from '../components/ReceiptParser';
import NumericInput from '../components/NumericInput';
import GlassCard from '../components/GlassCard';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddItems'>;
type Tab = 'manual' | 'photo';

export default function AddItemsScreen({ navigation }: Props) {
  const items = useBillStore((s) => s.items);
  const people = useBillStore((s) => s.people);
  const addItem = useBillStore((s) => s.addItem);
  const removeItem = useBillStore((s) => s.removeItem);

  const [tab, setTab] = useState<Tab>('manual');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(0);

  function handleAddItem() {
    const name = itemName.trim();
    if (!name || itemPrice <= 0) return;
    addItem({ name, price: itemPrice, splitMode: 'all', assignedTo: [] });
    setItemName('');
    setItemPrice(0);
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Tab bar */}
        <GlassCard style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'manual' && styles.tabActive]}
            onPress={() => setTab('manual')}
          >
            <Text
              style={[styles.tabText, tab === 'manual' && styles.tabTextActive]}
            >
              Manual Entry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'photo' && styles.tabActive]}
            onPress={() => setTab('photo')}
          >
            <Text
              style={[styles.tabText, tab === 'photo' && styles.tabTextActive]}
            >
              Photo Upload
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              people={people}
              onPress={() =>
                navigation.navigate('ItemAssignment', { itemId: item.id })
              }
              onDelete={() => removeItem(item.id)}
            />
          )}
          ListHeaderComponent={
            <View>
              {/* Manual or Photo entry panel */}
              {tab === 'manual' ? (
                <GlassCard style={styles.manualPanel}>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Item name..."
                    placeholderTextColor={COLORS.muted}
                    value={itemName}
                    onChangeText={setItemName}
                    returnKeyType="next"
                  />
                  <NumericInput
                    label="Price"
                    value={itemPrice}
                    onChange={setItemPrice}
                    mode="currency"
                  />
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      (!itemName.trim() || itemPrice <= 0) && styles.addBtnDisabled,
                    ]}
                    onPress={handleAddItem}
                    disabled={!itemName.trim() || itemPrice <= 0}
                  >
                    <Text style={styles.addBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </GlassCard>
              ) : (
                <ReceiptParser />
              )}

              {items.length > 0 && (
                <Text style={styles.listHeader}>
                  What y'all got ({items.length}) — tap to assign
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nothing yet 🍽️{'\n'}
              {tab === 'manual'
                ? 'Add what y\'all ordered above.'
                : 'Snap a pic of the receipt 📸'}
            </Text>
          }
          ListFooterComponent={
            items.length > 0 ? (
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => navigation.navigate('TaxTipDiscount')}
              >
                <Text style={styles.continueBtnText}>
                  Continue ({items.length} {items.length === 1 ? 'item' : 'items'})
                </Text>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    margin: SPACING.xl,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.muted, fontWeight: '600', fontSize: FONT_SIZE.sm },
  tabTextActive: { color: '#fff' },
  list: { padding: SPACING.xl },
  manualPanel: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  nameInput: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  listHeader: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
    lineHeight: 24,
  },
  continueBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.lg },
});
