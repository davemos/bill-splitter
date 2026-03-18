import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { createSession, joinSession } from '../services/sessionService';
import { useAuthStore } from '../store/useAuthStore';
import { getPreferredName } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionEntry'>;

export default function SessionEntryScreen({ navigation }: Props) {
  const { profile, wallet } = useAuthStore();
  const prefilled = profile ? getPreferredName(profile) : '';
  const myVenmo = wallet?.paymentLinks.find((l) => l.type === 'venmo')?.handle;
  const [hostName, setHostName] = useState(prefilled);
  const [guestName, setGuestName] = useState(prefilled);
  const [joinCode, setJoinCode] = useState('');
  const [hostLoading, setHostLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  async function handleHost() {
    const name = hostName.trim();
    if (!name) {
      Alert.alert('Enter your name', 'Please enter your name to host a dinner.');
      return;
    }
    setHostLoading(true);
    try {
      const sessionId = await createSession(name, myVenmo);
      navigation.replace('Lobby', { sessionId });
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setHostLoading(false);
    }
  }

  async function handleJoin() {
    const name = guestName.trim();
    const code = joinCode.trim().toUpperCase();
    if (!name) {
      Alert.alert('Enter your name', 'Please enter your name to join.');
      return;
    }
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Session codes are 6 characters long.');
      return;
    }
    setJoinLoading(true);
    try {
      const sessionId = await joinSession(code, name);
      navigation.replace('Lobby', { sessionId });
    } catch (err) {
      Alert.alert('Could not join', String(err));
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.inner}>
          {/* Host card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🍽 Host a Dinner</Text>
            <Text style={styles.cardSub}>
              Create a session and share the code with your group.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Your name..."
              placeholderTextColor={COLORS.muted}
              value={hostName}
              onChangeText={setHostName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleHost}
            />
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!hostName.trim() || hostLoading) && styles.btnDisabled,
              ]}
              onPress={handleHost}
              disabled={!hostName.trim() || hostLoading}
            >
              {hostLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Session</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Join card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📲 Join a Dinner</Text>
            <Text style={styles.cardSub}>
              Enter the 6-character code from the host.
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor={COLORS.muted}
              value={joinCode}
              onChangeText={(t) =>
                setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
              }
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Your name..."
              placeholderTextColor={COLORS.muted}
              value={guestName}
              onChangeText={setGuestName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!guestName.trim() || joinCode.length !== 6 || joinLoading) &&
                  styles.btnDisabled,
              ]}
              onPress={handleJoin}
              disabled={!guestName.trim() || joinCode.length !== 6 || joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Join Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  kav: { flex: 1 },
  inner: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSub: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  codeInput: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
    gap: SPACING.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
