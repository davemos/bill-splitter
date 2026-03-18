import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ParsedReceiptItem } from '../types';
import { parseReceiptImage } from '../services/claudeApi';
import { useApiKey } from '../hooks/useApiKey';
import { useBillStore } from '../store/useBillStore';
import { useFeatureGate } from '../hooks/useFeatureGate';
import NumericInput from './NumericInput';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function ReceiptParser() {
  const { apiKey } = useApiKey();
  const bulkAddItems = useBillStore((s) => s.bulkAddItems);
  const setReceiptParseStatus = useBillStore((s) => s.setReceiptParseStatus);
  const receiptParseStatus = useBillStore((s) => s.receiptParseStatus);
  const updateExtras = useBillStore((s) => s.updateExtras);
  const { isUnlocked, requireUnlock } = useFeatureGate('ai_receipt');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [parsedTax, setParsedTax] = useState<number>(0);

  async function pickImage(fromCamera: boolean) {
    if (!requireUnlock()) return;

    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to take a photo.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library access is needed to choose a photo.');
        return;
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
        });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    setParsedItems([]);
    setConfidence(null);
    setParsedTax(0);
  }

  async function handleParse() {
    if (!imageUri) return;
    if (!apiKey) {
      Alert.alert(
        'No API Key',
        'Please set your Anthropic API key on the Home screen first.'
      );
      return;
    }

    setReceiptParseStatus('loading');
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType =
        imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const parsed = await parseReceiptImage(base64, mimeType, apiKey);
      setParsedItems(parsed.items);
      setConfidence(parsed.confidence);
      setParsedTax(parsed.taxAmount ?? 0);
      setReceiptParseStatus('success');
    } catch (err) {
      setReceiptParseStatus('error', String(err));
      Alert.alert('Parse failed', String(err));
    }
  }

  function updateParsedItem(index: number, patch: Partial<ParsedReceiptItem>) {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeParsedItem(index: number) {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddAll() {
    if (parsedItems.length === 0) return;
    bulkAddItems(
      parsedItems.map((item) => ({
        name: item.name,
        price: item.price,
        splitMode: 'all',
        assignedTo: [],
      }))
    );
    if (parsedTax > 0) {
      updateExtras({ taxAmount: parsedTax });
    }
    setImageUri(null);
    setParsedItems([]);
    setConfidence(null);
    setParsedTax(0);
    setReceiptParseStatus('idle');
  }

  const isLoading = receiptParseStatus === 'loading';

  return (
    <View style={styles.container}>
      {/* Image picker buttons */}
      {!imageUri && (
        <View style={styles.pickButtons}>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(false)}
          >
            <Text style={styles.pickBtnIcon}>🖼</Text>
            <Text style={styles.pickBtnText}>Choose Photo</Text>
            {!isUnlocked && <Text style={styles.lockBadge}>PRO</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(true)}
          >
            <Text style={styles.pickBtnIcon}>📷</Text>
            <Text style={styles.pickBtnText}>Take Photo</Text>
            {!isUnlocked && <Text style={styles.lockBadge}>PRO</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Lightbox */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxVisible(false)}
      >
        <StatusBar hidden />
        <TouchableOpacity
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setLightboxVisible(false)}
        >
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.lightboxClose}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image preview */}
      {imageUri && (
        <View style={styles.previewBox}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setLightboxVisible(true)} style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <View style={styles.tapOverlay}>
              <Text style={styles.tapOverlayText}>Tap to view full image</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => {
                setImageUri(null);
                setParsedItems([]);
                setReceiptParseStatus('idle');
                setParsedTax(0);
              }}
            >
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.parseBtn, isLoading && styles.parseBtnDisabled]}
              onPress={handleParse}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.parseBtnText}>Parse with Claude AI</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confidence warning */}
      {confidence && confidence !== 'high' && parsedItems.length > 0 && (
        <View
          style={[
            styles.confidenceBanner,
            confidence === 'low' && styles.confidenceBannerLow,
          ]}
        >
          <Text style={styles.confidenceText}>
            {confidence === 'medium'
              ? '⚠️ Some items may be unclear — please review the results.'
              : '⚠️ Image quality is low — results may be inaccurate. Please review carefully.'}
          </Text>
        </View>
      )}

      {/* Parsed items review */}
      {parsedItems.length > 0 && (
        <View style={styles.parsedSection}>
          <Text style={styles.parsedTitle}>
            Review items ({parsedItems.length})
          </Text>
          {parsedItems.map((item, index) => (
            <View key={index} style={styles.parsedItem}>
              <TextInput
                style={styles.parsedName}
                value={item.name}
                onChangeText={(text) => updateParsedItem(index, { name: text })}
                placeholderTextColor={COLORS.muted}
              />
              <NumericInput
                value={item.price}
                onChange={(v) => updateParsedItem(index, { price: v })}
                mode="currency"
              />
              <TouchableOpacity
                onPress={() => removeParsedItem(index)}
                hitSlop={8}
                style={styles.removeBtn}
              >
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Editable tax field */}
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Tax (applied to bill)</Text>
            <NumericInput
              value={parsedTax}
              onChange={setParsedTax}
              mode="currency"
              placeholder="0.00"
            />
          </View>

          <TouchableOpacity style={styles.addAllBtn} onPress={handleAddAll}>
            <Text style={styles.addAllBtnText}>
              Add All {parsedItems.length} Items to Bill
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.md },
  pickButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  pickBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickBtnIcon: { fontSize: 32, marginBottom: SPACING.sm },
  pickBtnText: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  lockBadge: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.accent,
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewBox: { marginBottom: SPACING.md },
  imageWrapper: { borderRadius: 12, overflow: 'hidden' },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  tapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  tapOverlayText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '600' },
  previewActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  retakeBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retakeBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: FONT_SIZE.md },
  parseBtn: {
    flex: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  parseBtnDisabled: { opacity: 0.6 },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  confidenceBanner: {
    backgroundColor: '#7c6200',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  confidenceBannerLow: { backgroundColor: '#7a1a1a' },
  confidenceText: { color: '#fff', fontSize: FONT_SIZE.sm, lineHeight: 20 },
  parsedSection: { marginTop: SPACING.sm },
  parsedTitle: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  parsedItem: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  parsedName: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    padding: 0,
  },
  removeBtn: { padding: SPACING.xs },
  removeIcon: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  taxRow: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taxLabel: {
    color: COLORS.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  addAllBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addAllBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
