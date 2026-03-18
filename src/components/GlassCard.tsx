import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { GLASS } from '../utils/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  onPress?: () => void;
  activeOpacity?: number;
}

export default function GlassCard({
  children,
  style,
  intensity = GLASS.blurIntensity,
  onPress,
  activeOpacity = 0.7,
}: Props) {
  const content = (
    <>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {children}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={activeOpacity}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
  },
  tint: {
    backgroundColor: GLASS.tint,
  },
});
