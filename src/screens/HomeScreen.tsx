import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { getPreferredName } from '../types';
import { useBillStore } from '../store/useBillStore';
import { useApiKey } from '../hooks/useApiKey';
import { useAuthStore } from '../store/useAuthStore';
import GlassCard from '../components/GlassCard';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const resetBill = useBillStore((s) => s.resetBill);
  const addPerson = useBillStore((s) => s.addPerson);
  const { apiKey, saveApiKey } = useApiKey();
  const { user, profile } = useAuthStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : null;

  function handleStart() {
    resetBill();
    if (profile) addPerson(getPreferredName(profile));
    navigation.navigate('AddPeople');
  }

  function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('Invalid key', 'Anthropic API keys start with "sk-ant-".');
      return;
    }
    saveApiKey(trimmed);
    setKeyInput('');
    setSettingsVisible(false);
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View />
          <TouchableOpacity
            onPress={() => user ? navigation.navigate('Profile') : navigation.navigate('Login')}
            hitSlop={12}
          >
            {user && initials ? (
              <View style={[styles.avatar, { backgroundColor: profile?.avatarColor ?? COLORS.accent }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            ) : (
              <View style={styles.guestAvatar}>
                <Text style={styles.guestAvatarText}>👤</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.emoji}>🍕</Text>
            <Text style={styles.title}>Splitr</Text>
            <Text style={styles.subtitle}>
              Go out. Order everything. Sort it later.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
              <Text style={styles.primaryBtnText}>Start a split</Text>
            </TouchableOpacity>

            <GlassCard
              style={styles.multiBtn}
              onPress={() => navigation.navigate('SessionEntry')}
            >
              <Text style={styles.multiBtnIcon}>🍽</Text>
              <View>
                <Text style={styles.multiBtnTitle}>Host a session</Text>
                <Text style={styles.multiBtnSub}>Everyone splits on their own phone</Text>
              </View>
            </GlassCard>

            <GlassCard
              style={styles.multiBtn}
              onPress={() => navigation.navigate('SessionEntry')}
            >
              <Text style={styles.multiBtnIcon}>📲</Text>
              <View>
                <Text style={styles.multiBtnTitle}>Join a session</Text>
                <Text style={styles.multiBtnSub}>Enter a code from the host</Text>
              </View>
            </GlassCard>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setKeyInput('');
                setSettingsVisible(true);
              }}
            >
              <Text style={styles.secondaryBtnText}>
                {apiKey ? '⚙️  API Key Saved' : '⚙️  Set API Key'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            An Anthropic API key is required to parse receipt photos with Claude AI.
          </Text>
        </ScrollView>

        {/* API Key Modal */}
        <Modal
          visible={settingsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSettingsVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <GlassCard style={styles.modalCard} intensity={80}>
              <Text style={styles.modalTitle}>Anthropic API Key</Text>
              <Text style={styles.modalHint}>
                Your key is stored securely on this device and never sent anywhere
                except directly to api.anthropic.com.
              </Text>
              <TextInput
                style={styles.keyInput}
                placeholder="sk-ant-..."
                placeholderTextColor={COLORS.muted}
                value={keyInput}
                onChangeText={setKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSettingsVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveKey}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '800' },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: GLASS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: { fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  multiBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  multiBtnIcon: { fontSize: 22 },
  multiBtnTitle: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  multiBtnSub: { color: COLORS.muted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.muted,
    textAlign: 'center',
  },
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
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  keyInput: {
    backgroundColor: GLASS.inputBg,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  cancelBtnText: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
});
