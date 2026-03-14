
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, ImageIcon, Trophy, ChevronRight } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ImageSourcePropType,
} from 'react-native';
import { comparePhotos, saveComparison } from '@/utils/api';

interface CompareResult {
  winner: number;
  similarity_1: number;
  similarity_2: number;
  explanation: string;
}

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  return { uri: source };
}

async function compressAndEncode(uri: string): Promise<string> {
  console.log('[Home] Compressing image:', uri);
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (manipResult.base64) {
      console.log('[Home] Image compressed, base64 length:', manipResult.base64.length);
      return manipResult.base64;
    }
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('[Home] Compression failed, reading original:', error);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  }
}

async function pickFromGallery(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) return result.assets[0].uri;
  return null;
}

async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) return result.assets[0].uri;
  return null;
}

// ─── Photo Slot ──────────────────────────────────────────────────────────────

interface PhotoSlotProps {
  label: string;
  uri: string | null;
  onGallery: () => void;
  onCamera: () => void;
  disabled: boolean;
  isWinner?: boolean;
  similarity?: number | null;
}

function PhotoSlot({ label, uri, onGallery, onCamera, disabled, isWinner, similarity }: PhotoSlotProps) {
  const imageSource = resolveImageSource(uri ?? undefined);
  const winnerBorder = isWinner === true;
  const loserBorder = isWinner === false;
  const borderColor = winnerBorder ? colors.success : loserBorder ? colors.error : colors.border;
  const similarityText = similarity != null ? `${Number(similarity).toFixed(0)}%` : null;

  return (
    <View style={styles.slotWrapper}>
      <Text style={styles.slotLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.slotCard, { borderColor }]}
        onPress={onGallery}
        activeOpacity={0.8}
        disabled={disabled}
      >
        {uri ? (
          <>
            <Image source={imageSource} style={styles.slotImage} resizeMode="cover" />
            {winnerBorder && (
              <View style={styles.winnerBadge}>
                <Trophy size={14} color="#fff" />
                <Text style={styles.winnerBadgeText}>Vincitore</Text>
              </View>
            )}
            {similarityText && (
              <View style={[styles.similarityBadge, { backgroundColor: winnerBorder ? colors.success : colors.error }]}>
                <Text style={styles.similarityBadgeText}>{similarityText}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.slotPlaceholder}>
            <ImageIcon size={36} color={colors.textSecondary} />
            <Text style={styles.slotPlaceholderText}>Tocca per aggiungere</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.slotButtons}>
        <TouchableOpacity
          style={[styles.slotBtn, { borderColor: colors.secondary }]}
          onPress={onGallery}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <ImageIcon size={16} color={colors.secondary} />
          <Text style={[styles.slotBtnText, { color: colors.text }]}>Galleria</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.slotBtn, { borderColor: colors.accent }]}
          onPress={onCamera}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Camera size={16} color={colors.accent} />
          <Text style={[styles.slotBtnText, { color: colors.text }]}>Fotocamera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { signOut } = useAuth();

  const [mainUri, setMainUri] = useState<string | null>(null);
  const [comp1Uri, setComp1Uri] = useState<string | null>(null);
  const [comp2Uri, setComp2Uri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [logoutModal, setLogoutModal] = useState(false);

  const showError = (message: string) => setErrorModal({ visible: true, message });

  const handleLogout = async () => {
    console.log('[Home] User confirmed logout');
    setLogoutModal(false);
    try {
      await signOut();
    } catch (e) {
      console.error('[Home] Logout error:', e);
    }
  };

  const handlePickMain = async (source: 'gallery' | 'camera') => {
    console.log('[Home] User tapped pick main photo:', source);
    const uri = source === 'gallery' ? await pickFromGallery() : await pickFromCamera();
    if (uri) { setMainUri(uri); setResult(null); }
  };

  const handlePickComp1 = async (source: 'gallery' | 'camera') => {
    console.log('[Home] User tapped pick comparison photo 1:', source);
    const uri = source === 'gallery' ? await pickFromGallery() : await pickFromCamera();
    if (uri) { setComp1Uri(uri); setResult(null); }
  };

  const handlePickComp2 = async (source: 'gallery' | 'camera') => {
    console.log('[Home] User tapped pick comparison photo 2:', source);
    const uri = source === 'gallery' ? await pickFromGallery() : await pickFromCamera();
    if (uri) { setComp2Uri(uri); setResult(null); }
  };

  const handleCompare = async () => {
    console.log('[Home] User tapped Confronta button');
    if (!mainUri || !comp1Uri || !comp2Uri) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      console.log('[Home] Encoding all 3 images to base64...');
      const [mainB64, comp1B64, comp2B64] = await Promise.all([
        compressAndEncode(mainUri),
        compressAndEncode(comp1Uri),
        compressAndEncode(comp2Uri),
      ]);

      console.log('[Home] Sending POST /functions/v1/compare');
      const res = await comparePhotos(mainB64, comp1B64, comp2B64);
      console.log('[Home] Compare result:', res);
      setResult(res);

      saveComparison(res).catch((e) => console.warn('[Home] Failed to save comparison:', e));
    } catch (error: unknown) {
      console.error('[Home] Compare error:', error);
      const msg = error instanceof Error ? error.message : "Si è verificato un errore durante il confronto.";
      showError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canCompare = !!mainUri && !!comp1Uri && !!comp2Uri && !isAnalyzing;

  const winner1 = result ? result.winner === 1 : undefined;
  const winner2 = result ? result.winner === 2 : undefined;
  const sim1 = result ? result.similarity_1 : null;
  const sim2 = result ? result.similarity_2 : null;

  const winnerLabel = result
    ? result.winner === 1
      ? 'Foto confronto 1'
      : 'Foto confronto 2'
    : '';

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.gradientContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.emojiRow}>
              <Text style={styles.emoji}>🤔</Text>
              <Text style={styles.emoji}>👥</Text>
              <Text style={styles.emoji}>✨</Text>
            </View>
            <Text style={styles.title}>Chi ti somiglia?</Text>
            <Text style={styles.subtitle}>
              Carica 3 foto e scopri quale delle due si somiglia di più alla principale!
            </Text>
          </View>

          {/* Main Photo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>📸</Text>
              <Text style={styles.sectionTitle}>Foto principale</Text>
            </View>
            <PhotoSlot
              label="La foto da confrontare"
              uri={mainUri}
              onGallery={() => handlePickMain('gallery')}
              onCamera={() => handlePickMain('camera')}
              disabled={isAnalyzing}
            />
          </View>

          {/* VS Divider */}
          <View style={styles.vsDivider}>
            <View style={styles.vsDividerLine} />
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.vsDividerLine} />
          </View>

          {/* Comparison Photos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🔍</Text>
              <Text style={styles.sectionTitle}>Foto da confrontare</Text>
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonSlot}>
                <PhotoSlot
                  label="Foto 1"
                  uri={comp1Uri}
                  onGallery={() => handlePickComp1('gallery')}
                  onCamera={() => handlePickComp1('camera')}
                  disabled={isAnalyzing}
                  isWinner={winner1}
                  similarity={sim1}
                />
              </View>
              <View style={styles.comparisonSlot}>
                <PhotoSlot
                  label="Foto 2"
                  uri={comp2Uri}
                  onGallery={() => handlePickComp2('gallery')}
                  onCamera={() => handlePickComp2('camera')}
                  disabled={isAnalyzing}
                  isWinner={winner2}
                  similarity={sim2}
                />
              </View>
            </View>
          </View>

          {/* Compare Button */}
          <TouchableOpacity
            style={[styles.compareButton, !canCompare && styles.compareButtonDisabled]}
            onPress={handleCompare}
            disabled={!canCompare}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canCompare ? [colors.secondary, colors.accent] : ['#555', '#333']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.compareGradient}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={styles.compareButtonText}>Analisi in corso...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.compareButtonEmoji}>🔍</Text>
                  <Text style={styles.compareButtonText}>Confronta</Text>
                  <ChevronRight size={20} color={colors.background} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Progress hint */}
          {!canCompare && !isAnalyzing && (
            <Text style={styles.hintText}>
              {!mainUri
                ? 'Aggiungi la foto principale per iniziare'
                : !comp1Uri
                ? 'Aggiungi la foto confronto 1'
                : 'Aggiungi la foto confronto 2'}
            </Text>
          )}

          {/* Results */}
          {result && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsTitleRow}>
                <Trophy size={24} color={colors.secondary} />
                <Text style={styles.resultsTitle}>Risultato</Text>
              </View>

              <View style={styles.winnerCard}>
                <Text style={styles.winnerLabel}>Somiglia di più a:</Text>
                <Text style={styles.winnerName}>{winnerLabel}</Text>
              </View>

              <View style={styles.similarityRow}>
                <View style={[styles.simCard, { borderColor: winner1 ? colors.success : colors.error }]}>
                  <Text style={styles.simCardLabel}>Foto 1</Text>
                  <Text style={[styles.simCardValue, { color: winner1 ? colors.success : colors.error }]}>
                    {Number(result.similarity_1).toFixed(0)}%
                  </Text>
                  {winner1 && <Text style={styles.simCardWinner}>🏆</Text>}
                </View>
                <View style={styles.simDivider} />
                <View style={[styles.simCard, { borderColor: winner2 ? colors.success : colors.error }]}>
                  <Text style={styles.simCardLabel}>Foto 2</Text>
                  <Text style={[styles.simCardValue, { color: winner2 ? colors.success : colors.error }]}>
                    {Number(result.similarity_2).toFixed(0)}%
                  </Text>
                  {winner2 && <Text style={styles.simCardWinner}>🏆</Text>}
                </View>
              </View>

              {result.explanation ? (
                <View style={styles.explanationCard}>
                  <Text style={styles.explanationTitle}>Spiegazione</Text>
                  <Text style={styles.explanationText}>{result.explanation}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              console.log('[Home] User tapped logout button');
              setLogoutModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Esci dall'account</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Error Modal */}
        <Modal
          visible={errorModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setErrorModal({ visible: false, message: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={styles.modalTitle}>Attenzione</Text>
              <Text style={styles.modalMessage}>{errorModal.message}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Logout Modal */}
        <Modal
          visible={logoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalEmoji}>👋</Text>
              <Text style={styles.modalTitle}>Uscire dall'account?</Text>
              <Text style={styles.modalMessage}>Sei sicuro di voler uscire?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButtonHalf, { backgroundColor: colors.textSecondary }]}
                  onPress={() => setLogoutModal(false)}
                >
                  <Text style={styles.modalButtonText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonHalf, { backgroundColor: colors.secondary }]}
                  onPress={handleLogout}
                >
                  <Text style={styles.modalButtonText}>Esci</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },

  header: { marginBottom: 28, alignItems: 'center' },
  emojiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  emoji: { fontSize: 32 },
  title: { fontSize: 30, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary },

  vsDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  vsDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  vsText: { fontSize: 18, fontWeight: 'bold', color: colors.accent },

  comparisonRow: { flexDirection: 'row', gap: 12 },
  comparisonSlot: { flex: 1 },

  slotWrapper: { gap: 8 },
  slotLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  slotCard: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  slotImage: { width: '100%', height: '100%' },
  slotPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  slotPlaceholderText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 8 },
  slotButtons: { flexDirection: 'row', gap: 8 },
  slotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    gap: 6,
  },
  slotBtnText: { fontSize: 12, fontWeight: '600' },

  winnerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  winnerBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  similarityBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  similarityBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },

  compareButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compareButtonDisabled: { opacity: 0.5 },
  compareGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  compareButtonEmoji: { fontSize: 20 },
  compareButtonText: { fontSize: 18, fontWeight: 'bold', color: colors.background },

  hintText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 10 },

  resultsSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    gap: 16,
  },
  resultsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultsTitle: { fontSize: 22, fontWeight: 'bold', color: colors.secondary },
  winnerCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  winnerLabel: { fontSize: 14, color: colors.textSecondary },
  winnerName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  similarityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  simCard: {
    flex: 1,
    backgroundColor: colors.cardDark,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    gap: 4,
  },
  simDivider: { width: 1, height: 60, backgroundColor: colors.border },
  simCardLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  simCardValue: { fontSize: 28, fontWeight: 'bold' },
  simCardWinner: { fontSize: 18 },
  explanationCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  explanationTitle: { fontSize: 15, fontWeight: 'bold', color: colors.secondary },
  explanationText: { fontSize: 14, color: colors.text, lineHeight: 22 },

  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
    backgroundColor: colors.card,
  },
  logoutButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  modalMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 100,
  },
  modalButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.background, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButtonHalf: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
