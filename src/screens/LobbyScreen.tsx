import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useSessionStore } from '../store/useSessionStore';
import { openBill, closeBill, unsubscribeFromSession } from '../services/sessionService';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

export default function LobbyScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const sessionCode = useSessionStore((s) => s.sessionCode);
  const participants = useSessionStore((s) => s.participants);
  const status = useSessionStore((s) => s.status);
  const isHost = useSessionStore((s) => s.isHost);

  // All devices auto-navigate when host opens the bill
  useEffect(() => {
    if (status === 'open') {
      navigation.replace('SharedBill', { sessionId });
    }
  }, [status, sessionId, navigation]);

  // Guests notified when host cancels from lobby
  useEffect(() => {
    if (status === 'closed' && !isHost) {
      Alert.alert(
        'Session ended',
        'The host has cancelled this session.',
        [{
          text: 'Go Home',
          onPress: () => {
            unsubscribeFromSession();
            useSessionStore.getState().resetSession();
            navigation.popToTop();
          },
        }],
        { cancelable: false }
      );
    }
  }, [status, isHost]);

  function handleCopyCode() {
    if (sessionCode) {
      Clipboard.setString(sessionCode);
      Alert.alert('Copied!', `Code "${sessionCode}" copied to clipboard.`);
    }
  }

  async function handleOpenBill() {
    try {
      await openBill(sessionId);
      // navigation happens via useEffect above
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  }

  function handleCancelSession() {
    Alert.alert('Cancel session?', 'This will end the session for all participants.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: async () => {
          try {
            await closeBill(sessionId);
            navigation.popToTop();
          } catch (err) {
            Alert.alert('Error', String(err));
          }
        },
      },
    ]);
  }

  function handleLeave() {
    Alert.alert('Leave session?', 'You will exit this dining session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          unsubscribeFromSession();
          useSessionStore.getState().resetSession();
          navigation.popToTop();
        },
      },
    ]);
  }

  const participantList = Object.entries(participants).map(([id, p]) => ({
    id,
    ...p,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={participantList}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.participantRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.participantName}>{item.name}</Text>
            {item.isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>Host</Text>
              </View>
            )}
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* Code display */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Share this code</Text>
              <Text style={styles.codeText}>{sessionCode}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                <Text style={styles.copyBtnText}>Copy Code</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>
              {participantList.length}{' '}
              {participantList.length === 1 ? 'person' : 'people'} joined
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {isHost ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.openBillBtn,
                    participantList.length < 1 && styles.btnDisabled,
                  ]}
                  onPress={handleOpenBill}
                >
                  <Text style={styles.openBillBtnText}>Open Bill →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelSessionBtn} onPress={handleCancelSession}>
                  <Text style={styles.cancelSessionBtnText}>Cancel Session</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>
                  Waiting for the host to open the bill…
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>Leave Session</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  codeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeLabel: { color: COLORS.muted, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  codeText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 6,
    marginBottom: SPACING.lg,
  },
  copyBtn: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyBtnText: { color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZE.sm },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  participantName: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  hostBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  hostBadgeText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  footer: { marginTop: SPACING.xl, gap: SPACING.md },
  openBillBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  openBillBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZE.lg },
  waitingBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  waitingText: { color: COLORS.muted, fontSize: FONT_SIZE.md, textAlign: 'center' },
  cancelSessionBtn: {
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.4)',
  },
  cancelSessionBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZE.md },
  leaveBtn: {
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  leaveBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: FONT_SIZE.md },
});
