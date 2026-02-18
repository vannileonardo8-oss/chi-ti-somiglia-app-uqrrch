
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { Stack, useRouter } from 'expo-router';
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
import { BACKEND_URL, authenticatedPost, getBearerToken } from '@/utils/api';

interface ImageData {
  uri: string;
  label: string;
}

export default function HomeScreen() {
  const router = useRouter();

  const [mainImage, setMainImage] = useState<ImageData | null>(null);
  const [compareImage1, setCompareImage1] = useState<ImageData | null>(null);
  const [compareImage2, setCompareImage2] = useState<ImageData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardColor = colors.card;
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;
  const accentColor = colors.accent;
  const purpleColor = colors.purple;

  const showError = (message: string) => {
    setErrorModal({ visible: true, message });
  };

  const pickImage = async (type: 'main' | 'compare1' | 'compare2') => {
    console.log('User tapped pick image button for:', type);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showError('Devi consentire l\'accesso alla galleria per caricare le foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('Image selected:', result.assets[0].uri);
      const imageData: ImageData = {
        uri: result.assets[0].uri,
        label: '',
      };

      if (type === 'main') {
        setMainImage(imageData);
      } else if (type === 'compare1') {
        setCompareImage1(imageData);
      } else {
        setCompareImage2(imageData);
      }
    }
  };

  const updateLabel = (type: 'main' | 'compare1' | 'compare2', label: string) => {
    if (type === 'main' && mainImage) {
      setMainImage({ ...mainImage, label });
    } else if (type === 'compare1' && compareImage1) {
      setCompareImage1({ ...compareImage1, label });
    } else if (type === 'compare2' && compareImage2) {
      setCompareImage2({ ...compareImage2, label });
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    console.log('[API] Uploading image:', imageUri);
    
    const formData = new FormData();
    
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    const file: any = {
      uri: imageUri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`,
    };
    
    formData.append('image', file);
    
    const token = await getBearerToken();
    
    const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Upload error:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API] Upload success:', data);
    return data.url;
  };

  const handleAnalyze = async () => {
    console.log('User tapped Analyze button');
    
    if (!mainImage || !compareImage1 || !compareImage2) {
      showError('Carica tutte e tre le foto per continuare.');
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('[API] Uploading images...');
      const [mainImageUrl, compareImage1Url, compareImage2Url] = await Promise.all([
        uploadImage(mainImage.uri),
        uploadImage(compareImage1.uri),
        uploadImage(compareImage2.uri),
      ]);
      
      console.log('[API] All images uploaded successfully');
      console.log('[API] Main:', mainImageUrl);
      console.log('[API] Compare1:', compareImage1Url);
      console.log('[API] Compare2:', compareImage2Url);
      
      console.log('[API] Requesting comparison with authenticated API...');
      const result = await authenticatedPost('/api/compare', {
        mainImageUrl,
        mainImageLabel: mainImage.label || 'Principale',
        compareImage1Url,
        compareImage1Label: compareImage1.label || 'Foto 1',
        compareImage2Url,
        compareImage2Label: compareImage2.label || 'Foto 2',
      });
      
      console.log('[API] Comparison result:', result);
      
      // Navigate directly to results
      router.push(`/results/${result.comparisonId}`);
    } catch (error: any) {
      console.error('Error analyzing images:', error);
      const errorMessage = error?.message || 'Si è verificato un errore durante l\'analisi. Riprova.';
      showError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = mainImage && compareImage1 && compareImage2 && !isAnalyzing;

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
          scrollEnabled={true}
        >
          <View style={styles.header}>
            <View style={styles.emojiRow}>
              <Text style={styles.emoji}>🤔</Text>
              <Text style={styles.emoji}>👥</Text>
              <Text style={styles.emoji}>✨</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>Chi ti somiglia?</Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              Carica tre foto e scopri chi assomiglia di più!
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>📸</Text>
              <Text style={[styles.sectionTitle, { color: secondaryColor }]}>Foto Principale</Text>
            </View>
            <TouchableOpacity
              style={[styles.imageCard, { backgroundColor: cardColor, borderColor: secondaryColor }]}
              onPress={() => pickImage('main')}
              activeOpacity={0.7}
            >
              {mainImage ? (
                <Image source={{ uri: mainImage.uri }} style={styles.image} />
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
            {mainImage && (
              <TextInput
                style={[styles.labelInput, { backgroundColor: cardColor, color: textColor, borderColor: secondaryColor }]}
                placeholder="Chi è? (es. Io, Mamma, Marco)"
                placeholderTextColor={textSecondaryColor}
                value={mainImage.label}
                onChangeText={(text) => updateLabel('main', text)}
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🆚</Text>
              <Text style={[styles.sectionTitle, { color: secondaryColor }]}>Foto da Confrontare</Text>
            </View>
            
            <View style={styles.compareRow}>
              <View style={styles.compareContainer}>
                <TouchableOpacity
                  style={[styles.compareCard, { backgroundColor: cardColor, borderColor: accentColor }]}
                  onPress={() => pickImage('compare1')}
                  activeOpacity={0.7}
                >
                  {compareImage1 ? (
                    <Image source={{ uri: compareImage1.uri }} style={styles.compareImage} />
                  ) : (
                    <View style={styles.comparePlaceholder}>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="add-photo-alternate"
                        size={32}
                        color={accentColor}
                      />
                      <Text style={[styles.compareNumber, { color: accentColor }]}>1</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {compareImage1 && (
                  <TextInput
                    style={[styles.compareLabelInput, { backgroundColor: cardColor, color: textColor, borderColor: accentColor }]}
                    placeholder="Nome"
                    placeholderTextColor={textSecondaryColor}
                    value={compareImage1.label}
                    onChangeText={(text) => updateLabel('compare1', text)}
                  />
                )}
              </View>

              <View style={styles.compareContainer}>
                <TouchableOpacity
                  style={[styles.compareCard, { backgroundColor: cardColor, borderColor: purpleColor }]}
                  onPress={() => pickImage('compare2')}
                  activeOpacity={0.7}
                >
                  {compareImage2 ? (
                    <Image source={{ uri: compareImage2.uri }} style={styles.compareImage} />
                  ) : (
                    <View style={styles.comparePlaceholder}>
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="add-photo-alternate"
                        size={32}
                        color={purpleColor}
                      />
                      <Text style={[styles.compareNumber, { color: purpleColor }]}>2</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {compareImage2 && (
                  <TextInput
                    style={[styles.compareLabelInput, { backgroundColor: cardColor, color: textColor, borderColor: purpleColor }]}
                    placeholder="Nome"
                    placeholderTextColor={textSecondaryColor}
                    value={compareImage2.label}
                    onChangeText={(text) => updateLabel('compare2', text)}
                  />
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.analyzeButton,
              !canAnalyze && styles.analyzeButtonDisabled,
            ]}
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

          <View style={{ height: 100 }} />
        </ScrollView>

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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionEmoji: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    marginBottom: 12,
    borderWidth: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  labelInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  compareRow: {
    flexDirection: 'row',
    gap: 16,
  },
  compareContainer: {
    flex: 1,
  },
  compareCard: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    marginBottom: 12,
    borderWidth: 3,
  },
  compareImage: {
    width: '100%',
    height: '100%',
  },
  comparePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareNumber: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  compareLabelInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
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
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  analyzeButtonEmoji: {
    fontSize: 20,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
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
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 100,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
