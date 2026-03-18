import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  WalletCard,
  WalletPaymentLink,
  CardType,
  PaymentLinkType,
} from '../types';
import { useAuthStore } from '../store/useAuthStore';
import {
  saveWalletCard,
  deleteWalletCard,
  savePaymentLink,
  deletePaymentLink,
  loadWallet,
} from '../services/userService';
import GlassCard from '../components/GlassCard';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

const CARD_ICONS: Record<CardType, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  other: '💳',
};

const LINK_ICONS: Record<PaymentLinkType, string> = {
  venmo: '💸',
  paypal: '🅿️',
  cashapp: '💵',
};

const LINK_LABELS: Record<PaymentLinkType, string> = {
  venmo: 'Venmo',
  paypal: 'PayPal',
  cashapp: 'Cash App',
};

const LINK_PLACEHOLDERS: Record<PaymentLinkType, string> = {
  venmo: '@username',
  paypal: 'email or @username',
  cashapp: '$cashtag',
};

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function WalletScreen({ navigation }: Props) {
  const { user, wallet, setWallet } = useAuthStore();
  const [cardModal, setCardModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);

  // Card form state
  const [cardLabel, setCardLabel] = useState('');
  const [cardType, setCardType] = useState<CardType>('visa');
  const [last4, setLast4] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Payment link form state
  const [linkType, setLinkType] = useState<PaymentLinkType>('venmo');
  const [linkHandle, setLinkHandle] = useState('');

  useEffect(() => {
    if (!user) navigation.replace('Login');
  }, [user]);

  if (!user || !wallet) return null;

  async function refreshWallet() {
    const updated = await loadWallet(user!.uid);
    setWallet(updated);
  }

  async function handleSaveCard() {
    if (!last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      Alert.alert('Invalid', 'Please enter exactly 4 digits for the card number.');
      return;
    }
    if (!expiryMonth || !expiryYear || !cardholderName.trim()) {
      Alert.alert('Missing info', 'Please fill in all card details.');
      return;
    }
    const card: WalletCard = {
      id: uuid(),
      label: cardLabel.trim() || `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} ••••${last4}`,
      cardType,
      last4,
      expiryMonth,
      expiryYear,
      cardholderName: cardholderName.trim(),
    };
    await saveWalletCard(user!.uid, card);
    await refreshWallet();
    setCardModal(false);
    resetCardForm();
  }

  async function handleDeleteCard(cardId: string) {
    Alert.alert('Remove card?', 'This will remove the card from your wallet.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteWalletCard(user!.uid, cardId);
          await refreshWallet();
        },
      },
    ]);
  }

  async function handleSaveLink() {
    if (!linkHandle.trim()) {
      Alert.alert('Missing info', 'Please enter your handle.');
      return;
    }
    const link: WalletPaymentLink = {
      id: uuid(),
      type: linkType,
      handle: linkHandle.trim(),
    };
    await savePaymentLink(user!.uid, link);
    await refreshWallet();
    setLinkModal(false);
    setLinkHandle('');
  }

  async function handleDeleteLink(linkId: string) {
    Alert.alert('Remove?', 'Remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePaymentLink(user!.uid, linkId);
          await refreshWallet();
        },
      },
    ]);
  }

  function resetCardForm() {
    setCardLabel('');
    setCardType('visa');
    setLast4('');
    setExpiryMonth('');
    setExpiryYear('');
    setCardholderName('');
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.inner}>

          {/* Payment Links */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Send Money</Text>
            <TouchableOpacity onPress={() => setLinkModal(true)}>
              <Text style={styles.addBtn}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {wallet.paymentLinks.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No payment links yet. Add your Venmo, PayPal, or Cash App.</Text>
            </GlassCard>
          ) : (
            wallet.paymentLinks.map((link) => (
              <GlassCard key={link.id} style={styles.itemCard}>
                <Text style={styles.itemIcon}>{LINK_ICONS[link.type]}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{LINK_LABELS[link.type]}</Text>
                  <Text style={styles.itemSub}>{link.handle}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteLink(link.id)} hitSlop={8}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              </GlassCard>
            ))
          )}

          {/* Cards */}
          <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
            <Text style={styles.sectionTitle}>Cards</Text>
            <TouchableOpacity onPress={() => setCardModal(true)}>
              <Text style={styles.addBtn}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.warningCard}>
            <Text style={styles.warningText}>
              🔒 Only the last 4 digits and expiry are stored — never your full card number.
            </Text>
          </GlassCard>

          {wallet.cards.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No cards added. Add a card for reference when splitting bills.</Text>
            </GlassCard>
          ) : (
            wallet.cards.map((card) => (
              <GlassCard key={card.id} style={styles.itemCard}>
                <Text style={styles.itemIcon}>{CARD_ICONS[card.cardType]}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{card.label}</Text>
                  <Text style={styles.itemSub}>
                    {card.cardholderName} · ••••{card.last4} · {card.expiryMonth}/{card.expiryYear}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteCard(card.id)} hitSlop={8}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              </GlassCard>
            ))
          )}
        </ScrollView>

        {/* Add Payment Link Modal */}
        <Modal visible={linkModal} transparent animationType="slide" onRequestClose={() => setLinkModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard} intensity={85}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['venmo', 'paypal', 'cashapp'] as PaymentLinkType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, linkType === t && styles.typeBtnActive]}
                    onPress={() => setLinkType(t)}
                  >
                    <Text style={[styles.typeBtnText, linkType === t && styles.typeBtnTextActive]}>
                      {LINK_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Handle</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={LINK_PLACEHOLDERS[linkType]}
                placeholderTextColor={COLORS.muted}
                value={linkHandle}
                onChangeText={setLinkHandle}
                autoCapitalize="none"
                returnKeyType="done"
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setLinkModal(false); setLinkHandle(''); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveLink}>
                  <Text style={styles.confirmBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Card Modal */}
        <Modal visible={cardModal} transparent animationType="slide" onRequestClose={() => setCardModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard} intensity={85}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Add Card Reference</Text>
                <Text style={styles.securityNote}>Only the last 4 digits are saved. Never enter your full card number.</Text>

                <Text style={styles.fieldLabel}>Card Type</Text>
                <View style={styles.typeRow}>
                  {(['visa', 'mastercard', 'amex', 'discover'] as CardType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, cardType === t && styles.typeBtnActive]}
                      onPress={() => setCardType(t)}
                    >
                      <Text style={[styles.typeBtnText, cardType === t && styles.typeBtnTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Label (optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. My Visa"
                  placeholderTextColor={COLORS.muted}
                  value={cardLabel}
                  onChangeText={setCardLabel}
                  returnKeyType="next"
                />

                <Text style={styles.fieldLabel}>Cardholder Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Name on card"
                  placeholderTextColor={COLORS.muted}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />

                <Text style={styles.fieldLabel}>Last 4 Digits</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="1234"
                  placeholderTextColor={COLORS.muted}
                  value={last4}
                  onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="next"
                />

                <View style={styles.expiryRow}>
                  <View style={styles.expiryField}>
                    <Text style={styles.fieldLabel}>Month</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="MM"
                      placeholderTextColor={COLORS.muted}
                      value={expiryMonth}
                      onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.expiryField}>
                    <Text style={styles.fieldLabel}>Year (YY)</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="26"
                      placeholderTextColor={COLORS.muted}
                      value={expiryYear}
                      onChangeText={(t) => setExpiryYear(t.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="done"
                    />
                  </View>
                </View>

                <View style={[styles.modalBtns, { marginTop: SPACING.md }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCardModal(false); resetCardForm(); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCard}>
                    <Text style={styles.confirmBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addBtn: { color: COLORS.accentLight, fontWeight: '700', fontSize: FONT_SIZE.sm },
  emptyCard: { padding: SPACING.md, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.muted, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  warningCard: {
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  warningText: { color: COLORS.accentLight, fontSize: FONT_SIZE.xs, lineHeight: 18 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  itemIcon: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  itemSub: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  deleteIcon: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  securityNote: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: SPACING.sm,
  },
  modalInput: {
    backgroundColor: GLASS.inputBg,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: GLASS.border,
    marginBottom: 2,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm },
  typeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  typeBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeBtnText: { color: COLORS.muted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  expiryRow: { flexDirection: 'row', gap: SPACING.md },
  expiryField: { flex: 1 },
  modalBtns: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: FONT_SIZE.md },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
});
