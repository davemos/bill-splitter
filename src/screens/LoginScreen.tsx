import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { signIn, signUp } from '../services/authService';
import GlassCard from '../components/GlassCard';
import { COLORS, SPACING, FONT_SIZE, GLASS } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const e = email.trim();
    const p = password.trim();
    const n = displayName.trim();

    if (!e || !p) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    if (mode === 'signup' && !n) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    if (p.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(e, p, n);
      } else {
        await signIn(e, p);
      }
      // Auth store listener will update state; navigate back to Home
      navigation.replace('Home');
    } catch (err: any) {
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password'
        ? 'Invalid email or password.'
        : err?.message ?? 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={GLASS.gradientBg} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <View style={styles.inner}>
            <Text style={styles.logo}>🍕</Text>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.sub}>
              {mode === 'signin'
                ? 'Sign in to access your profile and wallet.'
                : 'Save your payment info and profile.'}
            </Text>

            <GlassCard style={styles.form}>
              {mode === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.muted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="Password (6+ characters)"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </GlassCard>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              <Text style={styles.switchBtnText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
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
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  sub: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  form: { padding: SPACING.lg, marginBottom: SPACING.md },
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
  inputLast: { marginBottom: SPACING.lg },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  switchBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  switchBtnText: { color: COLORS.accentLight, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  skipBtnText: { color: COLORS.muted, fontSize: FONT_SIZE.sm },
});
