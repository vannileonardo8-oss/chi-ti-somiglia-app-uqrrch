
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, ChevronRight, ImageIcon, Camera } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  ImageSourcePropType,
  ActionSheetIOS,
} from 'react-native';
import { comparePhotos, saveComparison } from '@/utils/api';
import { FaceSelector } from '@/components/FaceSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompareResult {
  winner: number;
  similarity_1: number;
  similarity_2: number;
  explanation: string;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PendingFaceSelection {
  slotKey: 'main' | 'comp1' | 'comp2';
  uri: string;
  faces: FaceBox[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  console.log('[Home] Requesting media library permission');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    console.log('[Home] Media library permission denied');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.9,
  });
  if (!result.canceled && result.assets[0]) {
    console.log('[Home] Image picked from gallery:', result.assets[0].uri);
    return result.assets[0].uri;
  }
  return null;
}

async function pickFromCamera(): Promise<string | null> {
  console.log('[Home] Requesting camera permission');
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    console.log('[Home] Camera permission denied');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.9,
  });
  if (!result.canceled && result.assets[0]) {
    console.log('[Home] Photo taken from camera:', result.assets[0].uri);
    return result.assets[0].uri;
  }
  return null;
}

async function detectFacesViaGemini(uri: string): Promise<FaceBox[]> {
  console.log('[Home] Detecting faces via Gemini for:', uri);
  try {
    const base64 = await compressAndEncode(uri);
    const SUPABASE_URL = 'https://fdnurgfcocmgknbmpjtd.supabase.co';
    const ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbnVyZ2Zjb2NtZ2tuYm1wanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTE5ODgsImV4cCI6MjA4NzM2Nzk4OH0.D1IbWjRau2GFOcHVBC6cJ80LxvRgct7X2r0BRA1Gr20';

    console.log('[Home] Sending face-detect request to edge function');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-faces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ image_base64: base64 }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Home] Face detection result:', data);
      if (Array.isArray(data.faces) && data.faces.length > 0) {
        return data.faces as FaceBox[];
      }
    } else {
      console.warn('[Home] Face detection endpoint not available, status:', response.status);
    }
  } catch (err) {
    console.warn('[Home] Face detection failed:', err);
  }
  return [{ x: 5, y: 5, width: 90, height: 90 }];
}

async function cropToFace(uri: string, face: FaceBox): Promise<string> {
  console.log('[Home] Cropping image to face:', face);
  try {
    const info = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const imgWidth = info.width;
    const imgHeight = info.height;
    const originX = Math.round((face.x / 100) * imgWidth);
    const originY = Math.round((face.y / 100) * imgHeight);
    const cropWidth = Math.round((face.width / 100) * imgWidth);
    const cropHeight = Math.round((face.height / 100) * imgHeight);
    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log('[Home] Cropped face URI:', cropped.uri);
    return cropped.uri;
  } catch (err) {
    console.warn('[Home] Crop failed, using original:', err);
    return uri;
  }
}

// ─── Photo Slot ───────────────────────────────────────────────────────────────

interface PhotoSlotProps {
  slotLabel: string;
  uri: string | null;
  name: string;
  onNameChange: (v: string) => void;
  onPress: () => void;
  disabled: boolean;
  isWinner?: boolean;
  similarity?: number | null;
}

function PhotoSlot({
  slotLabel,
  uri,
  name,
  onNameChange,
  onPress,
  disabled,
  isWinner,
  similarity,
}: PhotoSlotProps) {
  const imageSource = resolveImageSource(uri ?? undefined);
  const winnerBorder = isWinner === true;
  const loserBorder = isWinner === false;
  const slotBorderColor = winnerBorder
    ? colors.success
    : loserBorder
    ? colors.error
    : colors.secondary;
  const similarityText = similarity != null ? `${Number(similarity).toFixed(0)}%` : null;

  return (
    <View style={styles.slotWrapper}>
      <Text style={styles.slotLabel}>{slotLabel}</Text>
      <TouchableOpacity
        style={[styles.slotCard, { borderColor: slotBorderColor }]}
        onPress={() => {
          console.log('[Home] User tapped photo slot:', slotLabel);
          onPress();
        }}
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
              <View
                style={[
                  styles.similarityBadge,
                  { backgroundColor: winnerBorder ? colors.success : colors.error },
                ]}
              >
                <Text style={styles.similarityBadgeText}>{similarityText}</Text>
              </View>
            )}
            <View style={styles.editOverlay}>
              <Camera size={18} color="#fff" />
            </View>
          </>
        ) : (
          <View style={styles.slotPlaceholder}>
            <ImageIcon size={36} color={colors.secondary} />
            <Text style={styles.slotPlaceholderText}>Tocca per aggiungere</Text>
          </View>
        )}
      </TouchableOpacity>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={(v) => {
          console.log('[Home] Name input changed for slot', slotLabel, ':', v);
          onNameChange(v);
        }}
        placeholder="Nome (es. Mamma)"
        placeholderTextColor={colors.textSecondary}
        editable={!disabled}
        maxLength={30}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { signOut } = useAuth();

  const [mainUri, setMainUri] = useState<string | null>(null);
  const [comp1Uri, setComp1Uri] = useState<string | null>(null);
  const [comp2Uri, setComp2Uri] = useState<string | null>(null);

  const [mainName, setMainName] = useState('');
  const [comp1Name, setComp1Name] = useState('');
  const [comp2Name, setComp2Name] = useState('');

  const [pendingFace, setPendingFace] = useState<PendingFaceSelection | null>(null);
  const [detectingFaces, setDetectingFaces] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [logoutModal, setLogoutModal] = useState(false);

  const showError = (message: string) => setErrorModal({ visible: true, message });

  // ── Slot tap — iOS uses native ActionSheet ──────────────────────────────────

  const openPickerForSlot = (slotKey: 'main' | 'comp1' | 'comp2') => {
    console.log('[Home] Opening ActionSheet for slot:', slotKey);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Annulla', 'Scegli dalla Galleria', 'Scatta una Foto'],
        cancelButtonIndex: 0,
        title: 'Aggiungi foto',
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          console.log('[Home] ActionSheet: gallery selected for slot:', slotKey);
          await handlePickSource(slotKey, 'gallery');
        } else if (buttonIndex === 2) {
          console.log('[Home] ActionSheet: camera selected for slot:', slotKey);
          await handlePickSource(slotKey, 'camera');
        }
      }
    );
  };

  const handlePickSource = async (
    slotKey: 'main' | 'comp1' | 'comp2',
    source: 'gallery' | 'camera'
  ) => {
    console.log('[Home] Picking photo for slot:', slotKey, 'source:', source);
    const uri = source === 'gallery' ? await pickFromGallery() : await pickFromCamera();
    if (!uri) return;

    setResult(null);
    setDetectingFaces(true);

    try {
      const faces = await detectFacesViaGemini(uri);
      console.log('[Home] Faces detected:', faces.length, 'for slot:', slotKey);

      if (faces.length <= 1) {
        const finalUri =
          faces.length === 1 && !(faces[0].x === 5 && faces[0].width === 90)
            ? await cropToFace(uri, faces[0])
            : uri;
        applyUri(slotKey, finalUri);
      } else {
        setPendingFace({ slotKey, uri, faces });
      }
    } finally {
      setDetectingFaces(false);
    }
  };

  const applyUri = (slotKey: 'main' | 'comp1' | 'comp2', uri: string) => {
    if (slotKey === 'main') setMainUri(uri);
    else if (slotKey === 'comp1') setComp1Uri(uri);
    else setComp2Uri(uri);
  };

  const handleFaceSelected = async (faceIndex: number) => {
    if (!pendingFace) return;
    console.log('[Home] Face selected index:', faceIndex, 'for slot:', pendingFace.slotKey);
    const face = pendingFace.faces[faceIndex];
    const croppedUri = await cropToFace(pendingFace.uri, face);
    applyUri(pendingFace.slotKey, croppedUri);
    setPendingFace(null);
  };

  const handleFaceSelectorCancel = () => {
    console.log('[Home] Face selector cancelled');
    if (pendingFace) {
      applyUri(pendingFace.slotKey, pendingFace.uri);
    }
    setPendingFace(null);
  };

  const handleLogout = async () => {
    console.log('[Home] User confirmed logout');
    setLogoutModal(false);
    try {
      await signOut();
    } catch (e) {
      console.error('[Home] Logout error:', e);
    }
  };

  const handleAnalyze = async () => {
    console.log('[Home] User tapped ANALIZZA ORA button');
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
      const msg =
        error instanceof Error ? error.message : 'Si è verificato un errore durante il confronto.';
      showError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = !!mainUri && !!comp1Uri && !!comp2Uri && !isAnalyzing && !detectingFaces;

  const winner1 = result ? result.winner === 1 : undefined;
  const winner2 = result ? result.winner === 2 : undefined;
  const sim1 = result ? result.similarity_1 : null;
  const sim2 = result ? result.similarity_2 : null;

  const winnerDisplayName = result
    ? result.winner === 1
      ? comp1Name.trim() || 'Foto 1'
      : comp2Name.trim() || 'Foto 2'
    : '';

  const comp1DisplayName = comp1Name.trim() || 'Foto 1';
  const comp2DisplayName = comp2Name.trim() || 'Foto 2';

  const hintText = !mainUri
    ? 'Aggiungi la foto principale per iniziare'
    : !comp1Uri
    ? 'Aggiungi la foto confronto 1'
    : 'Aggiungi la foto confronto 2';

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
          keyboardShouldPersistTaps="handled"
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
              slotLabel="La foto da confrontare"
              uri={mainUri}
              name={mainName}
              onNameChange={setMainName}
              onPress={() => openPickerForSlot('main')}
              disabled={isAnalyzing || detectingFaces}
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
                  slotLabel="Foto 1"
                  uri={comp1Uri}
                  name={comp1Name}
                  onNameChange={setComp1Name}
                  onPress={() => openPickerForSlot('comp1')}
                  disabled={isAnalyzing || detectingFaces}
                  isWinner={winner1}
                  similarity={sim1}
                />
              </View>
              <View style={styles.comparisonSlot}>
                <PhotoSlot
                  slotLabel="Foto 2"
                  uri={comp2Uri}
                  name={comp2Name}
                  onNameChange={setComp2Name}
                  onPress={() => openPickerForSlot('comp2')}
                  disabled={isAnalyzing || detectingFaces}
                  isWinner={winner2}
                  similarity={sim2}
                />
              </View>
            </View>
          </View>

          {/* Face detecting indicator */}
          {detectingFaces && (
            <View style={styles.detectingRow}>
              <ActivityIndicator color={colors.secondary} size="small" />
              <Text style={styles.detectingText}>Rilevamento volti...</Text>
            </View>
          )}

          {/* ANALIZZA ORA Button */}
          <TouchableOpacity
            style={[styles.compareButton, !canAnalyze && styles.compareButtonDisabled]}
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canAnalyze ? [colors.secondary, colors.accent] : ['#555', '#333']}
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
                  <Text style={styles.compareButtonText}>ANALIZZA ORA</Text>
                  <ChevronRight size={20} color={colors.background} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Progress hint */}
          {!canAnalyze && !isAnalyzing && !detectingFaces && (
            <Text style={styles.hintText}>{hintText}</Text>
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
                <Text style={styles.winnerName}>{winnerDisplayName}</Text>
              </View>

              <View style={styles.similarityRow}>
                <View style={[styles.simCard, { borderColor: winner1 ? colors.success : colors.error }]}>
                  <Text style={styles.simCardLabel}>{comp1DisplayName}</Text>
                  <Text style={[styles.simCardValue, { color: winner1 ? colors.success : colors.error }]}>
                    {Number(result.similarity_1).toFixed(0)}%
                  </Text>
                  {winner1 && <Text style={styles.simCardWinner}>🏆</Text>}
                </View>
                <View style={styles.simDivider} />
                <View style={[styles.simCard, { borderColor: winner2 ? colors.success : colors.error }]}>
                  <Text style={styles.simCardLabel}>{comp2DisplayName}</Text>
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

        {/* Face Selector */}
        {pendingFace && (
          <FaceSelector
            visible={!!pendingFace}
            imageUri={pendingFace.uri}
            faces={pendingFace.faces}
            onSelectFace={handleFaceSelected}
            onCancel={handleFaceSelectorCancel}
          />
        )}

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
                onPress={() => {
                  console.log('[Home] Error modal dismissed');
                  setErrorModal({ visible: false, message: '' });
                }}
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
                  onPress={() => {
                    console.log('[Home] Logout cancelled');
                    setLogoutModal(false);
                  }}
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
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

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
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  slotCard: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    borderWidth: 2.5,
    backgroundColor: colors.card,
  },
  slotImage: { width: '100%', height: '100%' },
  slotPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slotPlaceholderText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 6,
  },

  nameInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    fontWeight: '500',
  },

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

  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detectingText: { fontSize: 14, color: colors.textSecondary },

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
  compareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
    letterSpacing: 0.5,
  },

  hintText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },

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
  simCardLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
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
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 100,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.background,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButtonHalf: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
