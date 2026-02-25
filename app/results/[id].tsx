
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '@/contexts/AuthContext';
import { fetchComparisonById } from '@/lib/supabase';

interface Reason {
  feature: string;
  description: string;
  winnerValue?: number;
  loserValue?: number;
  similarity?: number;
}

interface ComparisonResult {
  id: string;
  main_image_url: string;
  main_image_label: string;
  compare_image_1_url: string;
  compare_image_1_label: string;
  compare_image_2_url: string;
  compare_image_2_label: string;
  winner_image: 1 | 2;
  analysis_result: {
    winnerSimilarity: number;
    loserSimilarity: number;
    reasons: Reason[];
    summary: string;
  };
  created_at: string;
}

function resolveImageSource(url: string) {
  if (!url) {
    console.warn('[Results] Empty image URL provided');
    return { uri: '' };
  }
  if (typeof url === 'string') {
    return { uri: url };
  }
  return url;
}

export default function ResultsScreen() {
  const { id } = useLocalSearchParams();
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewShotReady, setViewShotReady] = useState(false);
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  const { user } = useAuth();

  const loadResult = useCallback(async () => {
    if (!id || !user) {
      console.error('[Results] Missing ID or user');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Results] Loading comparison:', id);
      
      const data = await fetchComparisonById(id as string, user.id);
      
      console.log('[Results] Loaded comparison data');
      setResult(data);
      
      setTimeout(() => {
        setViewShotReady(true);
      }, 500);
    } catch (error) {
      console.error('[Results] Failed to load result:', error);
      showError('Impossibile caricare il risultato');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const handleShare = async () => {
    if (!user) {
      showError('Devi effettuare l&apos;accesso per condividere i risultati');
      return;
    }

    if (!viewShotReady || !result || !viewShotRef.current) {
      console.warn('[Results] ViewShot not ready for capture');
      showError('Attendi il caricamento completo prima di condividere');
      return;
    }

    try {
      console.log('[Results] Capturing screenshot for sharing...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const uri = await viewShotRef.current.capture();
      console.log('[Results] Screenshot captured:', uri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.error('[Results] Sharing not available on this device');
        showError('Condivisione non disponibile su questo dispositivo');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Condividi Risultato',
      });

      console.log('[Results] Sharing completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Results] Failed to share:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Impossibile condividere il risultato');
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  const handleNewComparison = () => {
    console.log('[Results] Starting new comparison');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/(home)');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Risultato',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Caricamento risultato...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Risultato',
            headerShown: true,
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={64}
            color={colors.text}
          />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Risultato non trovato
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const winnerUrl = result.winner_image === 1 ? result.compare_image_1_url : result.compare_image_2_url;
  const winnerLabel = result.winner_image === 1 ? result.compare_image_1_label : result.compare_image_2_label;
  const loserUrl = result.winner_image === 1 ? result.compare_image_2_url : result.compare_image_1_url;
  const loserLabel = result.winner_image === 1 ? result.compare_image_2_label : result.compare_image_1_label;

  const winnerSimilarity = result.analysis_result?.winnerSimilarity || 0;
  const loserSimilarity = result.analysis_result?.loserSimilarity || 0;
  const reasons = result.analysis_result?.reasons || [];
  const summary = result.analysis_result?.summary || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Risultato del Confronto',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 0.9 }}
          style={{ backgroundColor: colors.background }}
        >
          <LinearGradient
            colors={['#FF6B9D', '#C06C84', '#6C5B7B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>🏆 Vincitore!</Text>
            <View style={styles.winnerContainer}>
              <Image
                source={resolveImageSource(winnerUrl)}
                style={styles.winnerImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('[Results] Failed to load winner image:', winnerUrl, e.nativeEvent.error);
                }}
              />
              <View style={styles.crownBadge}>
                <IconSymbol
                  ios_icon_name="crown.fill"
                  android_material_icon_name="star"
                  size={32}
                  color="#FFD700"
                />
              </View>
            </View>
            <Text style={styles.winnerLabel}>{winnerLabel || 'Vincitore'}</Text>
            <Text style={styles.similarityText}>
              Somiglianza: {winnerSimilarity.toFixed(1)}%
            </Text>
          </LinearGradient>

          <View style={styles.comparisonSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Confronto con
            </Text>
            <View style={styles.mainImageContainer}>
              <Image
                source={resolveImageSource(result.main_image_url)}
                style={styles.mainImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('[Results] Failed to load main image:', result.main_image_url, e.nativeEvent.error);
                }}
              />
              <Text style={[styles.mainImageLabel, { color: colors.text }]}>
                {result.main_image_label || 'Principale'}
              </Text>
            </View>
          </View>

          <View style={styles.loserSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Secondo Classificato
            </Text>
            <View style={styles.loserContainer}>
              <Image
                source={resolveImageSource(loserUrl)}
                style={styles.loserImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('[Results] Failed to load loser image:', loserUrl, e.nativeEvent.error);
                }}
              />
              <View style={styles.loserInfo}>
                <Text style={[styles.loserLabel, { color: colors.text }]}>
                  {loserLabel || 'Secondo'}
                </Text>
                <Text style={[styles.loserSimilarity, { color: colors.text }]}>
                  Somiglianza: {loserSimilarity.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {summary && (
            <View style={styles.summarySection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Riepilogo
              </Text>
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {summary}
              </Text>
            </View>
          )}

          {reasons.length > 0 && (
            <View style={styles.reasonsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Motivazioni Dettagliate
              </Text>
              {reasons.map((reason, index) => (
                <View key={index} style={styles.reasonCard}>
                  <View style={styles.reasonHeader}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={[styles.reasonFeature, { color: colors.text }]}>
                      {reason.feature}
                    </Text>
                  </View>
                  <Text style={[styles.reasonDescription, { color: colors.text }]}>
                    {reason.description}
                  </Text>
                  {reason.similarity !== undefined && (
                    <Text style={[styles.reasonSimilarity, { color: colors.text }]}>
                      Somiglianza: {reason.similarity.toFixed(1)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ViewShot>

        <TouchableOpacity
          style={styles.newComparisonButton}
          onPress={handleNewComparison}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color="#fff"
          />
          <Text style={styles.newComparisonButtonText}>
            Nuovo Confronto
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={48}
              color="#ff3b30"
            />
            <Text style={styles.modalTitle}>Errore</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModalVisible(false)}
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
  shareButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerGradient: {
    padding: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  winnerContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  winnerImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FFD700',
    backgroundColor: '#f0f0f0',
  },
  crownBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  winnerLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  similarityText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  comparisonSection: {
    padding: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mainImageContainer: {
    alignItems: 'center',
  },
  mainImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
  },
  mainImageLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  loserSection: {
    padding: 24,
  },
  loserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  loserImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  loserInfo: {
    flex: 1,
    marginLeft: 16,
  },
  loserLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loserSimilarity: {
    fontSize: 16,
    opacity: 0.7,
  },
  summarySection: {
    padding: 24,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  reasonsSection: {
    padding: 24,
  },
  reasonCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonFeature: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reasonDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reasonSimilarity: {
    fontSize: 14,
    opacity: 0.7,
  },
  newComparisonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  newComparisonButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
