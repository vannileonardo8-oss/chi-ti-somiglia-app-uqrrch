
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface ImageData {
  uri: string;
  label: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [mainImage, setMainImage] = useState<ImageData | null>(null);
  const [compareImage1, setCompareImage1] = useState<ImageData | null>(null);
  const [compareImage2, setCompareImage2] = useState<ImageData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const secondaryColor = isDark ? colors.secondaryDark : colors.secondary;

  const pickImage = async (type: 'main' | 'compare1' | 'compare2') => {
    console.log('User tapped pick image button for:', type);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permesso necessario', 'Devi consentire l&apos;accesso alla galleria per caricare le foto.');
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

  const handleAnalyze = async () => {
    console.log('User tapped Analyze button');
    
    if (!mainImage || !compareImage1 || !compareImage2) {
      Alert.alert('Foto mancanti', 'Carica tutte e tre le foto per continuare.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // TODO: Backend Integration - POST /api/upload/image for each image (multipart form data)
      // TODO: Backend Integration - POST /api/compare with { mainImageUrl, mainImageLabel, compareImage1Url, compareImage1Label, compareImage2Url, compareImage2Label }
      // TODO: Backend Integration - Navigate to results screen with comparisonId
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to results (will be implemented after backend integration)
      console.log('Analysis complete, navigating to results');
      router.push('/results/mock-id');
    } catch (error) {
      console.error('Error analyzing images:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante l&apos;analisi. Riprova.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = mainImage && compareImage1 && compareImage2 && !isAnalyzing;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Chi ti somiglia?</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Carica tre foto e scopri chi assomiglia di più!
          </Text>
        </View>

        {/* Main Image */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: primaryColor }]}>Foto Principale</Text>
          <TouchableOpacity
            style={[styles.imageCard, { backgroundColor: cardColor }]}
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
                  color={textSecondaryColor}
                />
                <Text style={[styles.placeholderText, { color: textSecondaryColor }]}>
                  Tocca per caricare
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {mainImage && (
            <TextInput
              style={[styles.labelInput, { backgroundColor: cardColor, color: textColor }]}
              placeholder="Chi è? (es. Io, Mamma, Marco)"
              placeholderTextColor={textSecondaryColor}
              value={mainImage.label}
              onChangeText={(text) => updateLabel('main', text)}
            />
          )}
        </View>

        {/* Comparison Images */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: secondaryColor }]}>Foto da Confrontare</Text>
          
          <View style={styles.compareRow}>
            {/* Compare Image 1 */}
            <View style={styles.compareContainer}>
              <TouchableOpacity
                style={[styles.compareCard, { backgroundColor: cardColor }]}
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
                      color={textSecondaryColor}
                    />
                    <Text style={[styles.compareNumber, { color: textSecondaryColor }]}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
              {compareImage1 && (
                <TextInput
                  style={[styles.compareLabelInput, { backgroundColor: cardColor, color: textColor }]}
                  placeholder="Nome"
                  placeholderTextColor={textSecondaryColor}
                  value={compareImage1.label}
                  onChangeText={(text) => updateLabel('compare1', text)}
                />
              )}
            </View>

            {/* Compare Image 2 */}
            <View style={styles.compareContainer}>
              <TouchableOpacity
                style={[styles.compareCard, { backgroundColor: cardColor }]}
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
                      color={textSecondaryColor}
                    />
                    <Text style={[styles.compareNumber, { color: textSecondaryColor }]}>2</Text>
                  </View>
                )}
              </TouchableOpacity>
              {compareImage2 && (
                <TextInput
                  style={[styles.compareLabelInput, { backgroundColor: cardColor, color: textColor }]}
                  placeholder="Nome"
                  placeholderTextColor={textSecondaryColor}
                  value={compareImage2.label}
                  onChangeText={(text) => updateLabel('compare2', text)}
                />
              )}
            </View>
          </View>
        </View>

        {/* Analyze Button */}
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
            colors={canAnalyze ? [primaryColor, secondaryColor] : ['#CCCCCC', '#999999']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.analyzeGradient}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analizza Ora</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  imageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    marginBottom: 12,
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
  },
  labelInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
  },
  analyzeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
