import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  mode?: 'currency' | 'percentage' | 'plain';
  placeholder?: string;
  maxValue?: number;
}

export default function NumericInput({
  value,
  onChange,
  label,
  mode = 'currency',
  placeholder = '0.00',
  maxValue,
}: Props) {
  const [text, setText] = useState(value === 0 ? '' : String(value));

  function handleChange(raw: string) {
    setText(raw);
  }

  function handleBlur() {
    const parsed = parseFloat(text);
    if (isNaN(parsed) || parsed < 0) {
      setText(value === 0 ? '' : String(value));
      return;
    }
    const clamped = maxValue !== undefined ? Math.min(parsed, maxValue) : parsed;
    setText(clamped === 0 ? '' : String(clamped));
    onChange(clamped);
  }

  const prefix = mode === 'currency' ? '$' : '';
  const suffix = mode === 'percentage' ? '%' : '';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        {prefix ? <Text style={styles.adornment}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          returnKeyType="done"
        />
        {suffix ? <Text style={styles.adornment}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  adornment: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    marginHorizontal: SPACING.xs,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    padding: 0,
  },
});
