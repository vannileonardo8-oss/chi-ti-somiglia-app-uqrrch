
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useColorScheme,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { apiGet } from '@/utils/api';

interface ComparisonHistoryItem {
  id: string;
  mainImageUrl: string;
  mainImageLabel: string;
  compareImage1Url: string;
  compareImage1Label: string;
  compareImage2Url: string;
  compareImage2Label: string;
  winner: 1 | 2;
  createdAt: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
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

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    console.log('[API] Loading comparison history');
    setLoading(true);
    
    try {
      const data = await apiGet<ComparisonHistoryItem[]>('/api/comparisons');
      console.log('[API] History loaded:', data);
      setHistory(data);
    } catch (error) {
      console.error('[API] Error loading history:', error);
      setErrorModal({
        visible: true,
        message: 'Impossibile caricare la cronologia. Riprova più tardi.',
      });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (id: string) => {
    console.log('User tapped history item:', id);
    router.push(`/results/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return 'Oggi';
    }
    if (diffDays === 1) {
      return 'Ieri';
    }
    if (diffDays < 7) {
      const daysDiffText = `${diffDays} giorni fa`;
      return daysDiffText;
    }
    
    const dateText = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    return dateText;
  };

  const renderItem = ({ item }: { item: ComparisonHistoryItem }) => {
    const winnerLabel = item.winner === 1 ? item.compareImage1Label : item.compareImage2Label;
    const dateText = formatDate(item.createdAt);
    
    return (
      <TouchableOpacity
        style={[styles.historyCard, { backgroundColor: cardColor }]}
        onPress={() => handleItemPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.imagesRow}>
          <Image source={{ uri: item.mainImageUrl }} style={styles.thumbnail} />
          <View style={styles.vsContainer}>
            <Text style={[styles.vsText, { color: textSecondaryColor }]}>VS</Text>
          </View>
          <Image source={{ uri: item.compareImage1Url }} style={styles.thumbnail} />
          <Image source={{ uri: item.compareImage2Url }} style={styles.thumbnail} />
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.labelRow}>
            <Text style={[styles.mainLabel, { color: textColor }]}>{item.mainImageLabel}</Text>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={16}
              color={textSecondaryColor}
            />
            <Text style={[styles.winnerText, { color: primaryColor }]}>{winnerLabel}</Text>
          </View>
          <Text style={[styles.dateText, { color: textSecondaryColor }]}>{dateText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 48 }]}>
        <Text style={[styles.title, { color: textColor }]}>Cronologia</Text>
        <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
          I tuoi confronti passati
        </Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="clock"
            android_material_icon_name="history"
            size={64}
            color={textSecondaryColor}
          />
          <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
            Nessun confronto ancora
          </Text>
          <Text style={[styles.emptySubtext, { color: textSecondaryColor }]}>
            Inizia un nuovo confronto per vedere i risultati qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Errore</Text>
            <Text style={[styles.modalMessage, { color: textSecondaryColor }]}>
              {errorModal.message}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
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
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  vsContainer: {
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  winnerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
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
