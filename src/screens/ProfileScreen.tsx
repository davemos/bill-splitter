import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { updateDisplayName, updateNickname } from '../services/userService';
import GlassCard from '../components/GlassCard';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, profile, setProfile, signOut } = useAuthStore();
  const [nameText, setNameText] = useState(profile?.displayName ?? '');
  const [nicknameText, setNicknameText] = useState(profile?.nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);

  useEffect(() => {
    if (!user) navigation.replace('Login');
  }, [user]);

  if (!user || !profile) return null;

  const initials = profile.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSaveName() {
    const trimmed = nameText.trim();
    if (!trimmed || !user || !profile) return;
    setSaving(true);
    try {
      await updateDisplayName(user.uid, trimmed);
      setProfile({ ...profile, displayName: trimmed });
      Alert.alert('Saved', 'Display name updated.');
    } catch {
      Alert.alert('Error', 'Could not save name.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNickname() {
    if (!user || !profile) return;
    setSavingNickname(true);
    try {
      await updateNickname(user.uid, nicknameText.trim());
      setProfile({ ...profile, nickname: nicknameText.trim() });
    } catch {
      Alert.alert('Error', 'Could not save nickname.');
    } finally {
      setSavingNickname(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace('Home');
        },
      },
    ]);
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.inner}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.memberSince}>
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Display name */}
          <Text style={styles.sectionTitle}>Display Name</Text>
          <GlassCard style={styles.card}>
            <TextInput
              style={styles.input}
              value={nameText}
              onChangeText={setNameText}
              placeholder="Your name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveName}
              disabled={saving || nameText.trim() === profile.displayName}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Name'}</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Nickname */}
          <Text style={styles.sectionTitle}>Nickname</Text>
          <GlassCard style={styles.card}>
            <TextInput
              style={styles.input}
              value={nicknameText}
              onChangeText={setNicknameText}
              placeholder="e.g. Dave, JD, Captain"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Text style={styles.nicknameHint}>
              Used instead of your full name in sessions and splits.
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, savingNickname && { opacity: 0.6 }]}
              onPress={handleSaveNickname}
              disabled={savingNickname || nicknameText.trim() === (profile.nickname ?? '')}
            >
              <Text style={styles.saveBtnText}>{savingNickname ? 'Saving…' : 'Save Nickname'}</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Wallet shortcut */}
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <GlassCard style={styles.walletRow} onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.walletIcon}>💳</Text>
            <View style={styles.walletInfo}>
              <Text style={styles.walletTitle}>My Wallet</Text>
              <Text style={styles.walletSub}>Cards, Venmo, PayPal, CashApp</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </GlassCard>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  avatarWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  email: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  memberSince: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginTop: 4 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  card: { padding: SPACING.md, marginBottom: SPACING.md },
  input: {
    backgroundColor: GLASS.inputBg,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: GLASS.border,
    marginBottom: SPACING.sm,
  },
  nicknameHint: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },
  walletRow: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  walletIcon: { fontSize: 24 },
  walletInfo: { flex: 1 },
  walletTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  walletSub: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  chevron: { color: COLORS.muted, fontSize: 20 },
  signOutBtn: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.4)',
    borderRadius: 12,
  },
  signOutText: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZE.md },
});
