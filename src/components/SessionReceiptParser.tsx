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
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ParsedReceiptItem } from '../types';
import { parseReceiptImage } from '../services/claudeApi';
import { bulkAddSessionItems } from '../services/sessionService';
import { useApiKey } from '../hooks/useApiKey';
import { useFeatureGate } from '../hooks/useFeatureGate';
import NumericInput from './NumericInput';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

interface Props {
  sessionId: string;
  deviceId: string;
  onTaxDetected?: (amount: number) => void;
}

export default function SessionReceiptParser({
  sessionId,
  deviceId,
  onTaxDetected,
}: Props) {
  const { apiKey } = useApiKey();
  const { isUnlocked, requireUnlock } = useFeatureGate('ai_receipt');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function pickImage(fromCamera: boolean) {
    if (!requireUnlock()) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
        });
    if (result.canceled || !result.assets[0]) return;
    setImageUri(result.assets[0].uri);
    setParsedItems([]);
    setConfidence(null);
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
    setIsLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType =
        imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const parsed = await parseReceiptImage(base64, mimeType, apiKey);
      setParsedItems(parsed.items);
      setConfidence(parsed.confidence);
      if (parsed.taxAmount && onTaxDetected) onTaxDetected(parsed.taxAmount);
    } catch (err) {
      Alert.alert('Parse failed', String(err));
    } finally {
      setIsLoading(false);
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

  async function handleAddAll() {
    if (parsedItems.length === 0) return;
    try {
      await bulkAddSessionItems(sessionId, deviceId, parsedItems);
      setImageUri(null);
      setParsedItems([]);
      setConfidence(null);
    } catch (err) {
      Alert.alert('Error adding items', String(err));
    }
  }

  return (
    <View style={styles.container}>
      {!imageUri && (
        <View style={styles.pickButtons}>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(false)}>
            <Text style={styles.pickBtnIcon}>🖼</Text>
            <Text style={styles.pickBtnText}>Choose Photo</Text>
            {!isUnlocked && <Text style={styles.lockBadge}>PRO</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
            <Text style={styles.pickBtnIcon}>📷</Text>
            <Text style={styles.pickBtnText}>Take Photo</Text>
            {!isUnlocked && <Text style={styles.lockBadge}>PRO</Text>}
          </TouchableOpacity>
        </View>
      )}

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
              onPress={() => { setImageUri(null); setParsedItems([]); }}
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

      {confidence && confidence !== 'high' && parsedItems.length > 0 && (
        <View style={[styles.banner, confidence === 'low' && styles.bannerLow]}>
          <Text style={styles.bannerText}>
            {confidence === 'medium'
              ? '⚠️ Some items may be unclear — please review.'
              : '⚠️ Low quality image — review carefully.'}
          </Text>
        </View>
      )}

      {parsedItems.length > 0 && (
        <View>
          <Text style={styles.reviewTitle}>Review items ({parsedItems.length})</Text>
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
              <TouchableOpacity onPress={() => removeParsedItem(index)} hitSlop={8}>
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addAllBtn} onPress={handleAddAll}>
            <Text style={styles.addAllBtnText}>
              Add All {parsedItems.length} Items to Session
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.md },
  pickButtons: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  pickBtn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
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
  imageWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: SPACING.sm },
  previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  tapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 6, alignItems: 'center',
  },
  tapOverlayText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '600' },
  previewActions: { flexDirection: 'row', gap: SPACING.sm },
  retakeBtn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  retakeBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: FONT_SIZE.md },
  parseBtn: { flex: 2, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: SPACING.md, alignItems: 'center' },
  parseBtnDisabled: { opacity: 0.6 },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  banner: { backgroundColor: '#7c6200', borderRadius: 10, padding: SPACING.md, marginBottom: SPACING.md },
  bannerLow: { backgroundColor: '#7a1a1a' },
  bannerText: { color: '#fff', fontSize: FONT_SIZE.sm },
  reviewTitle: { color: COLORS.muted, fontSize: FONT_SIZE.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  parsedItem: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  parsedName: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600', padding: 0 },
  removeIcon: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  addAllBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.sm },
  addAllBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  lightboxOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center', alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  lightboxClose: {
    position: 'absolute', top: 52, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
