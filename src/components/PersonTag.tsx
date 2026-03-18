import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface Props {
  name: string;
  onRemove?: () => void;
  selected?: boolean;
  onPress?: () => void;
}

export default function PersonTag({ name, onRemove, selected, onPress }: Props) {
  const avatarColor = getAvatarColor(name);
  const initials = getInitials(name);

  const content = (
    <View style={styles.wrapper}>
      <View style={[
        styles.circle,
        { backgroundColor: avatarColor },
        selected && styles.circleSelected,
      ]}>
        <Text style={styles.initials}>{initials}</Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={6} style={styles.removeBtn}>
            <Text style={styles.removeIcon}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 72,
    marginRight: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  initials: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.background,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeIcon: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
  },
  name: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
