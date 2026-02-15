
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiGet } from '@/utils/api';

interface Reason {
  feature: string;
  description: string;
  similarity: number;
}

interface ComparisonResult {
  id: string;
  mainImageUrl: string;
  mainImageLabel: string;
  compareImage1Url: string;
  compareImage1Label: string;
  compareImage2Url: string;
  compareImage2Label: string;
  winner: 1 | 2;
  winnerLabel: string;
  reasons: Reason[];
  summary: string;
  createdAt: string;
}

export default function ResultsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const successColor = colors.success;

  useEffect(() => {
    loadResult();
  }, [id]);

  const loadResult = async () => {
    console.log('[API] Loading comparison result for id:', id);
    setLoading(true);
    
    try {
      const data = await apiGet<ComparisonResult>(`/api/comparisons/${id}`);
      console.log('[API] Result loaded:', data);
      setResult(data);
    } catch (error) {
      console.error('[API] Error loading result:', error);
      setErrorModal({
        visible: true,
        message: 'Impossibile caricare i risultati. Riprova più tardi.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    console.log('User tapped share button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!result) {
      return;
    }

    const winnerLabel = result.winner === 1 ? result.compareImage1Label : result.compareImage2Label;
    const mainLabel = result.mainImageLabel || 'la foto principale';
    
    const shareText = `🎉 Risultato "Chi ti somiglia?"\n\n${winnerLabel} assomiglia di più a ${mainLabel}!\n\n${result.summary}`;

    try {
      await Share.share({
        message: shareText,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleNewComparison = () => {
    console.log('User tapped new comparison button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/(home)');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Risultati',
            headerBackTitle: 'Indietro',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Caricamento risultati...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Risultati',
            headerBackTitle: 'Indietro',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>
            Impossibile caricare i risultati
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const winnerImage = result.winner === 1 ? result.compareImage1Url : result.compareImage2Url;
  const winnerLabel = result.winner === 1 ? result.compareImage1Label : result.compareImage2Label;
  const loserImage = result.winner === 1 ? result.compareImage2Url : result.compareImage1Url;
  const loserLabel = result.winner === 1 ? result.compareImage2Label : result.compareImage1Label;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Risultati',
          headerBackTitle: 'Indietro',
        }}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner Announcement */}
        <View style={styles.winnerSection}>
          <View style={styles.crownContainer}>
            <IconSymbol
              ios_icon_name="crown.fill"
              android_material_icon_name="emoji-events"
              size={48}
              color={colors.accent}
            />
          </View>
          <Text style={[styles.winnerTitle, { color: textColor }]}>Il Vincitore è</Text>
          <Text style={[styles.winnerName, { color: primaryColor }]}>{winnerLabel}</Text>
        </View>

        {/* Images Comparison */}
        <View style={styles.imagesSection}>
          <View style={styles.imageRow}>
            {/* Main Image */}
            <View style={styles.imageContainer}>
              <View style={[styles.imageCard, { backgroundColor: cardColor }]}>
                <Image source={{ uri: result.mainImageUrl }} style={styles.resultImage} />
              </View>
              <Text style={[styles.imageLabel, { color: textSecondaryColor }]}>
                {result.mainImageLabel || 'Principale'}
              </Text>
            </View>

            {/* Winner Image */}
            <View style={styles.imageContainer}>
              <View style={[styles.imageCard, styles.winnerCard, { backgroundColor: cardColor }]}>
                <Image source={{ uri: winnerImage }} style={styles.resultImage} />
                <View style={[styles.winnerBadge, { backgroundColor: successColor }]}>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              </View>
              <Text style={[styles.imageLabel, { color: successColor }]}>{winnerLabel}</Text>
            </View>
          </View>

          {/* Loser Image (smaller) */}
          <View style={styles.loserContainer}>
            <View style={[styles.loserCard, { backgroundColor: cardColor }]}>
              <Image source={{ uri: loserImage }} style={styles.loserImage} />
            </View>
            <Text style={[styles.loserLabel, { color: textSecondaryColor }]}>{loserLabel}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
          <Text style={[styles.summaryText, { color: textColor }]}>{result.summary}</Text>
        </View>

        {/* Detailed Reasons */}
        <View style={styles.reasonsSection}>
          <Text style={[styles.reasonsTitle, { color: textColor }]}>Analisi Dettagliata</Text>
          
          {result.reasons.map((reason, index) => {
            const similarityColor = reason.similarity >= 85 ? successColor : reason.similarity >= 70 ? colors.warning : textSecondaryColor;
            const similarityText = `${reason.similarity}%`;
            
            return (
              <View key={index} style={[styles.reasonCard, { backgroundColor: cardColor }]}>
                <View style={styles.reasonHeader}>
                  <Text style={[styles.reasonFeature, { color: textColor }]}>{reason.feature}</Text>
                  <Text style={[styles.reasonSimilarity, { color: similarityColor }]}>
                    {similarityText}
                  </Text>
                </View>
                <Text style={[styles.reasonDescription, { color: textSecondaryColor }]}>
                  {reason.description}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${reason.similarity}%`, backgroundColor: similarityColor },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[primaryColor, colors.secondaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.shareButtonText}>Condividi Risultato</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: cardColor }]}
            onPress={handleNewComparison}
            activeOpacity={0.8}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={20}
              color={primaryColor}
            />
            <Text style={[styles.newButtonText, { color: primaryColor }]}>
              Nuovo Confronto
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
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
            <Text style={[styles.modalTitle, { color: textColor }]}>Errore</Text>
            <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
              {errorModal.message}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
              onPress={() => {
                setErrorModal({ visible: false, message: '' });
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  winnerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  crownContainer: {
    marginBottom: 16,
  },
  winnerTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  imagesSection: {
    marginBottom: 24,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    width: '100%',
    marginBottom: 8,
  },
  winnerCard: {
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  winnerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  loserContainer: {
    alignItems: 'center',
  },
  loserCard: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 100,
    aspectRatio: 3 / 4,
    marginBottom: 8,
    opacity: 0.6,
  },
  loserImage: {
    width: '100%',
    height: '100%',
  },
  loserLabel: {
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  reasonsSection: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonFeature: {
    fontSize: 16,
    fontWeight: '600',
  },
  reasonSimilarity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reasonDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsSection: {
    gap: 12,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
