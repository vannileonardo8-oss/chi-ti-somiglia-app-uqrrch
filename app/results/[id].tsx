
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { apiGet } from '@/utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { colors } from '@/styles/commonStyles';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

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

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | undefined): { uri: string } | number {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as number;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [viewShotReady, setViewShotReady] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    loadResult();
  }, [id]);

  useEffect(() => {
    if (result && !loading) {
      const timer = setTimeout(() => {
        console.log('[Results] ViewShot ready for capture');
        setViewShotReady(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [result, loading]);

  const loadResult = async () => {
    if (!id) {
      console.error('[Results] No comparison ID provided');
      showError('ID confronto mancante');
      return;
    }

    console.log('[Results] Loading comparison result:', id);
    setLoading(true);

    try {
      const data = await apiGet<ComparisonResult>(`/api/comparisons/${id}`);
      console.log('[Results] Result loaded successfully');
      setResult(data);
    } catch (error) {
      console.error('[Results] Error loading result:', error);
      showError('Impossibile caricare il risultato. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const showError = (message: string) => {
    setErrorModal({ visible: true, message });
  };

  const handleShare = useCallback(async () => {
    if (!result) {
      console.error('[Results] No result to share');
      showError('Nessun risultato da condividere');
      return;
    }

    if (!viewShotReady || !viewShotRef.current) {
      console.warn('[Results] ViewShot not ready yet');
      showError('Attendi un momento prima di condividere...');
      return;
    }

    console.log('[Results] Starting share process...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('[Results] Capturing screenshot...');
      const uri = await viewShotRef.current.capture();
      console.log('[Results] Screenshot captured:', uri);

      if (Platform.OS === 'web') {
        console.log('[Results] Using Web Share API');
        if (navigator.share) {
          await navigator.share({
            title: 'Chi ti somiglia?',
            text: `${result.mainImageLabel} assomiglia di più a ${result.winner === 1 ? result.compareImage1Label : result.compareImage2Label}!`,
          });
        } else {
          showError('La condivisione non è supportata su questo browser');
        }
      } else {
        console.log('[Results] Using Expo Sharing');
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Condividi il risultato',
        });
      }

      console.log('[Results] Share completed successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[Results] Error sharing:', error);
      if (error.message !== 'Share cancelled') {
        showError('Impossibile condividere il risultato. Riprova.');
      }
    }
  }, [result, viewShotReady]);

  const handleNewComparison = () => {
    console.log('[Results] User tapped new comparison button');
    router.push('/(tabs)/(home)');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento risultato...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Risultato non trovato</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleNewComparison}>
            <Text style={styles.backButtonText}>Torna alla Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const winnerImageUrl = result.winner === 1 ? result.compareImage1Url : result.compareImage2Url;
  const winnerLabel = result.winner === 1 ? result.compareImage1Label : result.compareImage2Label;
  const loserLabel = result.winner === 1 ? result.compareImage2Label : result.compareImage1Label;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>🎉 Risultato</Text>
              <Text style={styles.subtitle}>Ecco chi assomiglia di più!</Text>
            </View>

            <View style={styles.winnerCard}>
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>VINCITORE</Text>
              </View>
              <Image
                source={resolveImageSource(winnerImageUrl)}
                style={styles.winnerImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('[Results] Error loading winner image:', winnerImageUrl, e.nativeEvent.error);
                }}
              />
              <Text style={styles.winnerName}>{winnerLabel}</Text>
              {result.winnerSimilarity && (
                <Text style={styles.similarityText}>
                  Somiglianza: {Math.round(result.winnerSimilarity)}%
                </Text>
              )}
            </View>

            <View style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>Confronto</Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Image
                    source={resolveImageSource(result.mainImageUrl)}
                    style={styles.comparisonImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.error('[Results] Error loading main image:', result.mainImageUrl, e.nativeEvent.error);
                    }}
                  />
                  <Text style={styles.comparisonLabel}>{result.mainImageLabel}</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.comparisonItem}>
                  <Image
                    source={resolveImageSource(result.compareImage1Url)}
                    style={styles.comparisonImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.error('[Results] Error loading compare1 image:', result.compareImage1Url, e.nativeEvent.error);
                    }}
                  />
                  <Text style={styles.comparisonLabel}>{result.compareImage1Label}</Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Image
                    source={resolveImageSource(result.compareImage2Url)}
                    style={styles.comparisonImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.error('[Results] Error loading compare2 image:', result.compareImage2Url, e.nativeEvent.error);
                    }}
                  />
                  <Text style={styles.comparisonLabel}>{result.compareImage2Label}</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Riepilogo</Text>
              <Text style={styles.summaryText}>{result.summary}</Text>
            </View>

            <View style={styles.reasonsCard}>
              <Text style={styles.reasonsTitle}>Motivazioni Dettagliate</Text>
              {result.reasons.map((reason, index) => {
                const reasonKey = `${reason.feature}-${index}`;
                return (
                  <View key={reasonKey} style={styles.reasonItem}>
                    <View style={styles.reasonHeader}>
                      <Text style={styles.reasonNumber}>{index + 1}</Text>
                      <Text style={styles.reasonFeature}>{reason.feature}</Text>
                    </View>
                    <Text style={styles.reasonDescription}>{reason.description}</Text>
                    {reason.similarity !== undefined && (
                      <Text style={styles.reasonSimilarity}>
                        Somiglianza: {Math.round(reason.similarity)}%
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </LinearGradient>
      </ViewShot>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <IconSymbol
            ios_icon_name="square.and.arrow.up"
            android_material_icon_name="share"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.actionButtonText}>Condividi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.newButton]}
          onPress={handleNewComparison}
          activeOpacity={0.8}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.actionButtonText}>Nuovo</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.modalTitle}>Errore</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  winnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  winnerBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  winnerBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  winnerImage: {
    width: 200,
    height: 250,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  similarityText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonImage: {
    width: 80,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  reasonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  reasonsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reasonItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  reasonFeature: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reasonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 40,
    marginBottom: 4,
  },
  reasonSimilarity: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 40,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.95)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#34c759',
  },
  newButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
