import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useSessionStore, selectClaimerNames, selectClaimCount } from '../store/useSessionStore';
import {
  addSessionItem,
  removeSessionItem,
  claimItem,
  unclaimItem,
  updateSessionExtras,
  addSessionDiscount,
  removeSessionDiscount,
} from '../services/sessionService';
import SessionReceiptParser from '../components/SessionReceiptParser';
import NumericInput from '../components/NumericInput';
import { formatCurrency } from '../utils/calculations';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedBill'>;
type Tab = 'manual' | 'photo';

export default function SharedBillScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const isHost = useSessionStore((s) => s.isHost);
  const sessionCode = useSessionStore((s) => s.sessionCode);
  const myDeviceId = useSessionStore((s) => s.myDeviceId);
  const items = useSessionStore((s) => s.items);
  const claims = useSessionStore((s) => s.claims);
  const participants = useSessionStore((s) => s.participants);
  const extras = useSessionStore((s) => s.extras);

  const [tab, setTab] = useState<Tab>('manual');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(0);
  const [extrasExpanded, setExtrasExpanded] = useState(false);
  const [discountLabel, setDiscountLabel] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  function handleCopyCode() {
    if (sessionCode) {
      Clipboard.setString(sessionCode);
      Alert.alert('Copied!', `Code "${sessionCode}" copied to clipboard.`);
    }
  }

  async function handleAddItem() {
    const name = itemName.trim();
    if (!name || itemPrice <= 0) return;
    try {
      await addSessionItem(sessionId, myDeviceId!, { name, price: itemPrice });
      setItemName('');
      setItemPrice(0);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  }

  async function handleToggleClaim(itemId: string) {
    if (!myDeviceId) return;
    const isClaimed = claims[itemId]?.[myDeviceId] === true;
    try {
      if (isClaimed) {
        await unclaimItem(sessionId, itemId, myDeviceId);
      } else {
        await claimItem(sessionId, itemId, myDeviceId);
      }
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  }

  async function handleRemoveItem(itemId: string) {
    Alert.alert('Remove item?', 'This will remove the item and all claims on it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSessionItem(sessionId, itemId);
          } catch (err) {
            Alert.alert('Error', String(err));
          }
        },
      },
    ]);
  }

  async function handleAddDiscount() {
    const label = discountLabel.trim() || 'Discount';
    if (discountAmount <= 0) return;
    try {
      await addSessionDiscount(sessionId, { label, amount: discountAmount });
      setDiscountLabel('');
      setDiscountAmount(0);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const tipDollars =
    extras.tipMode === 'percentage'
      ? subtotal * (extras.tipValue / 100)
      : extras.tipValue;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isMine = myDeviceId ? claims[item.id]?.[myDeviceId] === true : false;
            const claimers = selectClaimerNames(claims, item.id, participants);
            const count = selectClaimCount(claims, item.id);
            const myShare = count > 0 ? item.price / count : item.price;

            return (
              <TouchableOpacity
                style={[styles.itemRow, isMine && styles.itemRowClaimed]}
                onPress={() => handleToggleClaim(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {claimers.length > 0 ? (
                    <Text style={styles.itemClaimers}>
                      {claimers.join(', ')} · {formatCurrency(myShare)} each
                    </Text>
                  ) : (
                    <Text style={styles.itemUnclaimed}>Tap to claim</Text>
                  )}
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                  {isMine && (
                    <View style={styles.claimedBadge}>
                      <Text style={styles.claimedBadgeText}>✓ Mine</Text>
                    </View>
                  )}
                  {isHost && (
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            <View>
              {/* Session code banner for host */}
              {isHost && sessionCode && (
                <TouchableOpacity style={styles.codeBanner} onPress={handleCopyCode} activeOpacity={0.7}>
                  <View>
                    <Text style={styles.codeBannerLabel}>Session code — tap to copy</Text>
                    <Text style={styles.codeBannerCode}>{sessionCode}</Text>
                  </View>
                  <Text style={styles.codeBannerIcon}>📋</Text>
                </TouchableOpacity>
              )}

              {/* Host input panel */}
              {isHost && (
                <View style={styles.hostPanel}>
                  <View style={styles.tabBar}>
                    <TouchableOpacity
                      style={[styles.tabBtn, tab === 'manual' && styles.tabBtnActive]}
                      onPress={() => setTab('manual')}
                    >
                      <Text style={[styles.tabBtnText, tab === 'manual' && styles.tabBtnTextActive]}>
                        Manual
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabBtn, tab === 'photo' && styles.tabBtnActive]}
                      onPress={() => setTab('photo')}
                    >
                      <Text style={[styles.tabBtnText, tab === 'photo' && styles.tabBtnTextActive]}>
                        Photo
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {tab === 'manual' ? (
                    <View style={styles.manualEntry}>
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
                    </View>
                  ) : (
                    <SessionReceiptParser
                      sessionId={sessionId}
                      deviceId={myDeviceId!}
                      onTaxDetected={(amount) =>
                        updateSessionExtras(sessionId, { taxAmount: amount })
                      }
                    />
                  )}
                </View>
              )}

              {/* Guest placeholder */}
              {!isHost && items.length === 0 && (
                <View style={styles.guestPlaceholder}>
                  <Text style={styles.guestPlaceholderText}>
                    Waiting for the host to add items…
                  </Text>
                </View>
              )}

              {items.length > 0 && (
                <Text style={styles.sectionLabel}>
                  {items.length} {items.length === 1 ? 'item' : 'items'} — tap to claim
                </Text>
              )}
            </View>
          }
          ListFooterComponent={
            <View>
              {/* Host extras panel */}
              {isHost && items.length > 0 && (
                <View style={styles.extrasPanel}>
                  <TouchableOpacity
                    style={styles.extrasHeader}
                    onPress={() => setExtrasExpanded((v) => !v)}
                  >
                    <Text style={styles.extrasTitle}>Tax, Tip & Discounts</Text>
                    <Text style={styles.extrasChevron}>{extrasExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {extrasExpanded && (
                    <View style={styles.extrasBody}>
                      <NumericInput
                        label="Tax Amount"
                        value={extras.taxAmount}
                        onChange={(v) => updateSessionExtras(sessionId, { taxAmount: v })}
                        mode="currency"
                      />

                      <View style={styles.tipRow}>
                        <TouchableOpacity
                          style={[styles.tipToggle, extras.tipMode === 'percentage' && styles.tipToggleActive]}
                          onPress={() => updateSessionExtras(sessionId, { tipMode: 'percentage' })}
                        >
                          <Text style={[styles.tipToggleText, extras.tipMode === 'percentage' && styles.tipToggleTextActive]}>%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tipToggle, extras.tipMode === 'amount' && styles.tipToggleActive]}
                          onPress={() => updateSessionExtras(sessionId, { tipMode: 'amount' })}
                        >
                          <Text style={[styles.tipToggleText, extras.tipMode === 'amount' && styles.tipToggleTextActive]}>$</Text>
                        </TouchableOpacity>
                      </View>
                      <NumericInput
                        label={extras.tipMode === 'percentage' ? 'Tip %' : 'Tip Amount'}
                        value={extras.tipValue}
                        onChange={(v) => updateSessionExtras(sessionId, { tipValue: v })}
                        mode={extras.tipMode === 'percentage' ? 'percentage' : 'currency'}
                      />
                      <Text style={styles.tipPreview}>
                        Tip: {formatCurrency(tipDollars)}
                      </Text>

                      {/* Discounts */}
                      {Object.entries(extras.discounts ?? {}).map(([id, d]) => (
                        <View key={id} style={styles.discountRow}>
                          <Text style={styles.discountLabel}>{d.label}</Text>
                          <Text style={styles.discountAmount}>-{formatCurrency(d.amount)}</Text>
                          <TouchableOpacity onPress={() => removeSessionDiscount(sessionId, id)} hitSlop={8}>
                            <Text style={styles.deleteIcon}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      <TextInput
                        style={styles.discountInput}
                        placeholder="Discount label..."
                        placeholderTextColor={COLORS.muted}
                        value={discountLabel}
                        onChangeText={setDiscountLabel}
                      />
                      <NumericInput
                        value={discountAmount}
                        onChange={setDiscountAmount}
                        mode="currency"
                        placeholder="0.00"
                      />
                      <TouchableOpacity
                        style={[styles.addBtn, discountAmount <= 0 && styles.addBtnDisabled]}
                        onPress={handleAddDiscount}
                        disabled={discountAmount <= 0}
                      >
                        <Text style={styles.addBtnText}>Add Discount</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.viewBillBtn, items.length === 0 && styles.addBtnDisabled]}
                onPress={() => navigation.navigate('PersonalBill', { sessionId })}
                disabled={items.length === 0}
              >
                <Text style={styles.viewBillBtnText}>View My Bill →</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={null}
          contentContainerStyle={styles.list}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  list: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  codeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  codeBannerLabel: { color: COLORS.muted, fontSize: FONT_SIZE.xs, marginBottom: 2 },
  codeBannerCode: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    letterSpacing: 4,
  },
  codeBannerIcon: { fontSize: 22 },
  hostPanel: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: FONT_SIZE.sm },
  tabBtnTextActive: { color: '#fff' },
  manualEntry: {},
  nameInput: {
    color: COLORS.text, fontSize: FONT_SIZE.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: SPACING.md, paddingVertical: SPACING.sm,
  },
  addBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  guestPlaceholder: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  guestPlaceholderText: { color: COLORS.muted, fontSize: FONT_SIZE.md, textAlign: 'center' },
  sectionLabel: {
    color: COLORS.muted, fontSize: FONT_SIZE.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  itemRowClaimed: { borderColor: COLORS.accent, backgroundColor: '#1a0e12' },
  itemLeft: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600', marginBottom: 2 },
  itemClaimers: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  itemUnclaimed: { color: COLORS.muted, fontSize: FONT_SIZE.sm, fontStyle: 'italic' },
  itemRight: { alignItems: 'flex-end', gap: SPACING.xs },
  itemPrice: { color: COLORS.accentLight, fontSize: FONT_SIZE.md, fontWeight: '700' },
  claimedBadge: {
    backgroundColor: COLORS.accent, borderRadius: 8,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  claimedBadgeText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  deleteBtn: { padding: SPACING.xs },
  deleteIcon: { fontSize: 14 },
  extrasPanel: {
    backgroundColor: COLORS.card, borderRadius: 14, marginTop: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  extrasHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg,
  },
  extrasTitle: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  extrasChevron: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
  extrasBody: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  tipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tipToggle: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 8,
    paddingVertical: SPACING.sm, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  tipToggleActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tipToggleText: { color: COLORS.muted, fontWeight: '700' },
  tipToggleTextActive: { color: '#fff' },
  tipPreview: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },
  discountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 8, padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  discountLabel: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.sm },
  discountAmount: { color: COLORS.success, fontWeight: '700', fontSize: FONT_SIZE.sm, marginRight: SPACING.sm },
  discountInput: {
    color: COLORS.text, fontSize: FONT_SIZE.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: SPACING.md, paddingVertical: SPACING.sm,
  },
  viewBillBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.xl,
  },
  viewBillBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZE.lg },
});
