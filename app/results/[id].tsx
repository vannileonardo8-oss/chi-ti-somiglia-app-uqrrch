
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiGet } from '@/utils/api';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface Reason {
  feature: string;
  description: string;
  winnerValue?: number;
  loserValue?: number;
  similarity?: number;
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
  winnerSimilarity?: number;
  loserSimilarity?: number;
  comparisonDifference?: number;
  summary: string;
  reasons: Reason[];
  createdAt: string;
}

export default function ResultsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardColor = colors.card;
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;
  const successColor = colors.success;

  const loadResult = useCallback(async () => {
    console.log('[API] Loading comparison result for id:', id);
    setLoading(true);
    
    try {
      const data = await apiGet<ComparisonResult>(`/api/comparisons/${id}`);
      console.log('[API] Result loaded:', data);
      
      if (data.winnerSimilarity === undefined && data.reasons && data.reasons.length > 0) {
        const winnerReasons = data.reasons.filter(r => r.similarity !== undefined);
        if (winnerReasons.length > 0) {
          const avgSimilarity = winnerReasons.reduce((sum, r) => sum + (r.similarity || 0), 0) / winnerReasons.length;
          data.winnerSimilarity = Math.round(avgSimilarity);
          data.loserSimilarity = Math.round(avgSimilarity * 0.65);
          data.comparisonDifference = data.winnerSimilarity - data.loserSimilarity;
          
          data.reasons = data.reasons.map(r => ({
            ...r,
            winnerValue: r.similarity || r.winnerValue || 0,
            loserValue: r.loserValue || Math.round((r.similarity || 0) * 0.65),
          }));
        }
      }
      
      if (data.winnerSimilarity === undefined) data.winnerSimilarity = 75;
      if (data.loserSimilarity === undefined) data.loserSimilarity = 50;
      if (data.comparisonDifference === undefined) {
        data.comparisonDifference = data.winnerSimilarity - data.loserSimilarity;
      }
      
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
  }, [id]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const handleShare = async () => {
    console.log('User tapped share button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!result || !viewShotRef.current) {
      return;
    }

    setSharing(true);

    try {
      console.log('[Share] Capturing screenshot...');
      const uri = await viewShotRef.current.capture();
      console.log('[Share] Screenshot captured:', uri);

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        console.log('[Share] Sharing screenshot...');
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Condividi il risultato',
        });
      } else {
        const winnerLabel = result.winner === 1 ? result.compareImage1Label : result.compareImage2Label;
        const mainLabel = result.mainImageLabel || 'la foto principale';
        const winnerSimilarityText = `${result.winnerSimilarity || 75}%`;
        
        const shareText = `🎉 Risultato "Chi ti somiglia?"\n\n${winnerLabel} assomiglia di più a ${mainLabel} con ${winnerSimilarityText} di somiglianza!\n\n${result.summary}`;
        
        await Share.share({
          message: shareText,
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[Share] Error sharing:', error);
      if (error.message !== 'User did not share') {
        setErrorModal({
          visible: true,
          message: 'Impossibile condividere il risultato. Riprova più tardi.',
        });
      }
    } finally {
      setSharing(false);
    }
  };

  const handleNewComparison = () => {
    console.log('User tapped new comparison button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/(home)');
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundDark]}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <Stack.Screen
            options={{
              headerShown: true,
              title: 'Risultati',
              headerBackTitle: 'Indietro',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
            }}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={secondaryColor} />
            <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
              Caricamento risultati...
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!result) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundDark]}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <Stack.Screen
            options={{
              headerShown: true,
              title: 'Risultati',
              headerBackTitle: 'Indietro',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
            }}
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.errorText, { color: textColor }]}>
              Impossibile caricare i risultati
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const winnerImage = result.winner === 1 ? result.compareImage1Url : result.compareImage2Url;
  const winnerLabel = result.winner === 1 ? result.compareImage1Label : result.compareImage2Label;
  const loserImage = result.winner === 1 ? result.compareImage2Url : result.compareImage1Url;
  const loserLabel = result.winner === 1 ? result.compareImage2Label : result.compareImage1Label;

  const winnerSimilarityText = `${result.winnerSimilarity || 75}%`;
  const loserSimilarityText = `${result.loserSimilarity || 50}%`;
  const differenceText = `${result.comparisonDifference || 25}%`;

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Risultati',
            headerBackTitle: 'Indietro',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
            <View style={[styles.shareableContent, { backgroundColor: bgColor }]}>
              {/* App Branding */}
              <View style={styles.brandingHeader}>
                <Text style={[styles.appName, { color: secondaryColor }]}>Chi ti somiglia?</Text>
                <Text style={[styles.appTagline, { color: textSecondaryColor }]}>
                  Scopri chi ti assomiglia di più! ✨
                </Text>
              </View>

              {/* Winner Announcement */}
              <View style={styles.winnerSection}>
                <View style={styles.crownContainer}>
                  <Text style={styles.crownEmoji}>👑</Text>
                </View>
                <Text style={[styles.winnerTitle, { color: textColor }]}>Il Vincitore è</Text>
                <Text style={[styles.winnerName, { color: secondaryColor }]}>{winnerLabel}</Text>
                <Text style={[styles.winnerSimilarity, { color: textColor }]}>{winnerSimilarityText}</Text>
                <Text style={[styles.winnerSubtitle, { color: textSecondaryColor }]}>
                  di somiglianza con {result.mainImageLabel}
                </Text>
              </View>

              {/* Comparison Cards */}
              <View style={styles.comparisonSection}>
                {/* Winner Card */}
                <View style={[styles.comparisonCard, { backgroundColor: cardColor }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>🏆</Text>
                    <Text style={[styles.cardTitle, { color: secondaryColor }]}>Vincitore</Text>
                  </View>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: winnerImage }} style={styles.comparisonImage} />
                    <View style={[styles.winnerBadge, { backgroundColor: successColor }]}>
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <Text style={[styles.cardLabel, { color: textColor }]}>{winnerLabel}</Text>
                  <Text style={[styles.cardPercentage, { color: secondaryColor }]}>
                    {winnerSimilarityText}
                  </Text>
                </View>

                {/* VS Divider */}
                <View style={styles.vsDivider}>
                  <Text style={[styles.vsText, { color: textColor }]}>VS</Text>
                  <Text style={[styles.differenceText, { color: textSecondaryColor }]}>
                    Differenza: {differenceText}
                  </Text>
                </View>

                {/* Loser Card */}
                <View style={[styles.comparisonCard, { backgroundColor: cardColor, opacity: 0.8 }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>🥈</Text>
                    <Text style={[styles.cardTitle, { color: textSecondaryColor }]}>Secondo</Text>
                  </View>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: loserImage }} style={styles.comparisonImage} />
                  </View>
                  <Text style={[styles.cardLabel, { color: textColor }]}>{loserLabel}</Text>
                  <Text style={[styles.cardPercentage, { color: textSecondaryColor }]}>
                    {loserSimilarityText}
                  </Text>
                </View>
              </View>

              {/* Main Image Reference */}
              <View style={[styles.mainImageCard, { backgroundColor: cardColor }]}>
                <Text style={[styles.mainImageTitle, { color: textColor }]}>
                  📸 Foto di Riferimento
                </Text>
                <View style={styles.mainImageContainer}>
                  <Image source={{ uri: result.mainImageUrl }} style={styles.mainImage} />
                </View>
                <Text style={[styles.mainImageLabel, { color: textSecondaryColor }]}>
                  {result.mainImageLabel}
                </Text>
              </View>

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                <Text style={[styles.summaryTitle, { color: textColor }]}>📊 Riepilogo</Text>
                <Text style={[styles.summaryText, { color: textSecondaryColor }]}>{result.summary}</Text>
              </View>

              {/* App Footer */}
              <View style={styles.brandingFooter}>
                <Text style={[styles.footerText, { color: textSecondaryColor }]}>
                  Creato con Chi ti somiglia? 🎉
                </Text>
              </View>
            </View>
          </ViewShot>

          {/* Detailed Reasons (not in screenshot) */}
          <View style={styles.reasonsSection}>
            <Text style={[styles.reasonsTitle, { color: textColor }]}>🔍 Analisi Dettagliata</Text>
            
            {result.reasons.map((reason, index) => {
              const winnerValue = reason.winnerValue || reason.similarity || 75;
              const loserValue = reason.loserValue || Math.round((reason.similarity || 75) * 0.65);
              const winnerValueText = `${winnerValue}%`;
              const loserValueText = `${loserValue}%`;
              
              return (
                <View key={index} style={[styles.reasonCard, { backgroundColor: cardColor }]}>
                  <Text style={[styles.reasonFeature, { color: secondaryColor }]}>
                    {reason.feature}
                  </Text>
                  <Text style={[styles.reasonDescription, { color: textSecondaryColor }]}>
                    {reason.description}
                  </Text>
                  
                  <View style={styles.comparisonBars}>
                    <View style={styles.barRow}>
                      <Text style={[styles.barLabel, { color: textColor }]}>{winnerLabel}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${winnerValue}%`, backgroundColor: secondaryColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barValue, { color: secondaryColor }]}>
                        {winnerValueText}
                      </Text>
                    </View>
                    
                    <View style={styles.barRow}>
                      <Text style={[styles.barLabel, { color: textColor }]}>{loserLabel}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${loserValue}%`, backgroundColor: textSecondaryColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barValue, { color: textSecondaryColor }]}>
                        {loserValueText}
                      </Text>
                    </View>
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
              disabled={sharing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[secondaryColor, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareGradient}
              >
                {sharing ? (
                  <>
                    <ActivityIndicator color={colors.background} size="small" />
                    <Text style={[styles.shareButtonText, { color: colors.background }]}>
                      Preparazione...
                    </Text>
                  </>
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="square.and.arrow.up"
                      android_material_icon_name="share"
                      size={20}
                      color={colors.background}
                    />
                    <Text style={[styles.shareButtonText, { color: colors.background }]}>
                      Condividi Risultato
                    </Text>
                  </>
                )}
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
                color={secondaryColor}
              />
              <Text style={[styles.newButtonText, { color: textColor }]}>
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
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={[styles.modalTitle, { color: textColor }]}>Errore</Text>
              <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
                {errorModal.message}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: secondaryColor }]}
                onPress={() => {
                  setErrorModal({ visible: false, message: '' });
                  if (!result) {
                    router.back();
                  }
                }}
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
  shareableContent: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
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
    marginBottom: 24,
  },
  crownContainer: {
    marginBottom: 12,
  },
  crownEmoji: {
    fontSize: 64,
  },
  winnerTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  winnerSimilarity: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  winnerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  comparisonSection: {
    marginBottom: 24,
  },
  comparisonCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  comparisonImage: {
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
  cardLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  vsDivider: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  differenceText: {
    fontSize: 14,
    marginTop: 4,
  },
  mainImageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  mainImageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mainImageContainer: {
    width: 120,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  mainImageLabel: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  brandingFooter: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reasonsSection: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reasonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reasonFeature: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reasonDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  comparisonBars: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    width: 60,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
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
    fontSize: 16,
    fontWeight: 'bold',
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
