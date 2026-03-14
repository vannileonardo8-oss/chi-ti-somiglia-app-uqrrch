
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { compareFace } from '@/utils/api';

interface ImageData {
  uri: string;
  label: string;
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: '' };
  return { uri: source };
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();

  const [mainImage, setMainImage] = useState<ImageData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [logoutModal, setLogoutModal] = useState(false);
  const [result, setResult] = useState<any>(null);

  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardColor = colors.card;
  const secondaryColor = colors.secondary;
  const accentColor = colors.accent;

  const showError = (message: string) => {
    setErrorModal({ visible: true, message });
  };

  const handleLogout = async () => {
    console.log('[Home] User confirmed logout');
    setLogoutModal(false);
    try {
      await signOut();
      console.log('[Home] User logged out successfully');
    } catch (error) {
      console.error('[Home] Logout error:', error);
    }
  };

  const compressAndEncode = async (uri: string): Promise<string> => {
    console.log('[Home] Compressing image:', uri);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipResult.base64) {
        console.log('[Home] Image compressed and encoded, length:', manipResult.base64.length);
        return manipResult.base64;
      }
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('[Home] Compression failed:', error);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  };

  const pickImage = async () => {
    console.log('[Home] User tapped pick image button');

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showError("Devi consentire l'accesso alla galleria per caricare le foto.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      console.log('[Home] Image selected:', pickerResult.assets[0].uri);
      setMainImage({ uri: pickerResult.assets[0].uri, label: '' });
      setResult(null);
    }
  };

  const takePhoto = async () => {
    console.log('[Home] User tapped take photo button');

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      showError("Devi consentire l'accesso alla fotocamera per scattare foto.");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!cameraResult.canceled && cameraResult.assets[0]) {
      console.log('[Home] Photo taken:', cameraResult.assets[0].uri);
      setMainImage({ uri: cameraResult.assets[0].uri, label: '' });
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    console.log('[Home] User tapped Analyze button');

    if (!mainImage) {
      showError('Carica una foto per continuare.');
      return;
    }

    if (!user) {
      showError("Devi effettuare l'accesso per analizzare le foto.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      console.log('[Home] Encoding image to base64...');
      const base64 = await compressAndEncode(mainImage.uri);

      console.log('[Home] Sending image to compare edge function...');
      const analysisResult = await compareFace(base64);
      console.log('[Home] Analysis result received:', analysisResult);

      setResult(analysisResult);
    } catch (error: any) {
      console.error('[Home] Error analyzing image:', error);
      let errorMessage = error?.message || "Si è verificato un errore durante l'analisi. Riprova.";

      if (error?.message?.includes('413') || error?.message?.toLowerCase().includes('payload too large')) {
        errorMessage = "L'immagine è troppo grande. Prova con una foto più piccola.";
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('Network')) {
        errorMessage = 'Errore di connessione. Verifica la tua connessione internet e riprova.';
      }

      showError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewHistory = () => {
    console.log('[Home] User tapped View History button');
    router.push('/(tabs)/history');
  };

  const canAnalyze = !!mainImage && !isAnalyzing;
  const mainImageSource = resolveImageSource(mainImage?.uri);

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
          <View style={styles.header}>
            <View style={styles.emojiRow}>
              <Text style={styles.emoji}>🤔</Text>
              <Text style={styles.emoji}>👥</Text>
              <Text style={styles.emoji}>✨</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>Chi ti somiglia?</Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              Carica una foto e scopri a chi assomigli!
            </Text>
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>📸</Text>
              <Text style={[styles.sectionTitle, { color: secondaryColor }]}>La Tua Foto</Text>
            </View>

            <TouchableOpacity
              style={[styles.imageCard, { backgroundColor: cardColor, borderColor: secondaryColor }]}
              onPress={pickImage}
              activeOpacity={0.7}
              disabled={isAnalyzing}
            >
              {mainImage ? (
                <Image source={mainImageSource} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="add-photo-alternate"
                    size={48}
                    color={secondaryColor}
                  />
                  <Text style={[styles.placeholderText, { color: secondaryColor }]}>
                    Tocca per caricare
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.photoButtonsRow}>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: cardColor, borderColor: secondaryColor }]}
                onPress={pickImage}
                disabled={isAnalyzing}
                activeOpacity={0.8}
              >
                <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo-library" size={20} color={secondaryColor} />
                <Text style={[styles.photoButtonText, { color: textColor }]}>Galleria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: cardColor, borderColor: accentColor }]}
                onPress={takePhoto}
                disabled={isAnalyzing}
                activeOpacity={0.8}
              >
                <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera-alt" size={20} color={accentColor} />
                <Text style={[styles.photoButtonText, { color: textColor }]}>Fotocamera</Text>
              </TouchableOpacity>
            </View>

            {mainImage && (
              <TextInput
                style={[styles.labelInput, { backgroundColor: cardColor, color: textColor, borderColor: secondaryColor }]}
                placeholder="Chi sei? (opzionale)"
                placeholderTextColor={textSecondaryColor}
                value={mainImage.label}
                onChangeText={(text) => setMainImage({ ...mainImage, label: text })}
                editable={!isAnalyzing}
              />
            )}
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeButton, !canAnalyze && styles.analyzeButtonDisabled]}
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canAnalyze ? [secondaryColor, accentColor] : ['#666666', '#444444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyzeGradient}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={[styles.analyzeButtonText, { color: colors.background }]}>
                    Analisi in corso...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.analyzeButtonEmoji}>🔍</Text>
                  <Text style={[styles.analyzeButtonText, { color: colors.background }]}>
                    Analizza Ora
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Results Section */}
          {result && (
            <View style={[styles.resultsSection, { backgroundColor: cardColor }]}>
              <Text style={[styles.resultTitle, { color: secondaryColor }]}>🏆 Risultati</Text>

              {result.matches && result.matches.length > 0 ? (
                result.matches.map((match: any, index: number) => {
                  const similarityNum = Number(match.similarity);
                  const similarityText = isNaN(similarityNum) ? String(match.similarity) : similarityNum.toFixed(1) + '%';
                  return (
                    <View key={index} style={[styles.matchCard, { borderColor: accentColor }]}>
                      <View style={styles.matchHeader}>
                        <Text style={[styles.matchName, { color: textColor }]}>{match.name}</Text>
                        <View style={[styles.matchBadge, { backgroundColor: accentColor }]}>
                          <Text style={[styles.matchSimilarity, { color: colors.background }]}>
                            {similarityText}
                          </Text>
                        </View>
                      </View>
                      {match.description ? (
                        <Text style={[styles.matchDescription, { color: textSecondaryColor }]}>
                          {match.description}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              ) : result.summary ? (
                <Text style={[styles.summaryText, { color: textColor }]}>{result.summary}</Text>
              ) : (
                <Text style={[styles.summaryText, { color: textSecondaryColor }]}>
                  Nessun risultato trovato.
                </Text>
              )}
            </View>
          )}

          {/* History Button */}
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: cardColor }]}
            onPress={handleViewHistory}
            activeOpacity={0.8}
          >
            <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="history" size={20} color={secondaryColor} />
            <Text style={[styles.historyButtonText, { color: textColor }]}>Vedi Storico</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: cardColor }]}
            onPress={() => {
              console.log('[Home] User tapped logout button');
              setLogoutModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoutButtonText, { color: textColor }]}>Esci</Text>
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
            <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={[styles.modalTitle, { color: textColor }]}>Attenzione</Text>
              <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
                {errorModal.message}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: secondaryColor }]}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={logoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
              <Text style={styles.modalEmoji}>👋</Text>
              <Text style={[styles.modalTitle, { color: textColor }]}>Uscire dall'account?</Text>
              <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
                Sei sicuro di voler uscire dal tuo account?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButtonHalf, { backgroundColor: textSecondaryColor }]}
                  onPress={() => setLogoutModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonHalf, { backgroundColor: secondaryColor }]}
                  onPress={handleLogout}
                >
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>Esci</Text>
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
  header: { marginBottom: 32, alignItems: 'center' },
  emojiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  emoji: { fontSize: 32 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionEmoji: { fontSize: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    marginBottom: 12,
    borderWidth: 3,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { marginTop: 12, fontSize: 16, fontWeight: 'bold' },
  photoButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  photoButtonText: { fontSize: 14, fontWeight: '600' },
  labelInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  analyzeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  analyzeButtonEmoji: { fontSize: 20 },
  analyzeButtonText: { fontSize: 18, fontWeight: 'bold' },
  resultsSection: {
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
  },
  resultTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  matchCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  matchBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  matchSimilarity: { fontSize: 14, fontWeight: 'bold' },
  matchDescription: { fontSize: 14, lineHeight: 20 },
  summaryText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  historyButtonText: { fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
  },
  logoutButtonText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, minWidth: 100 },
  modalButtonText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButtonHalf: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
