
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

const screenWidth = Dimensions.get('window').width;

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  return { uri: source };
}

function parseExplanationBullets(explanation: string): string[] {
  if (!explanation) return [];
  // Split on newlines, dashes, bullets, or numbered lists
  const lines = explanation
    .split(/\n|(?:\.\s+(?=[A-Z]))|(?:[-•*]\s+)|(?:\d+\.\s+)/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);
  if (lines.length <= 1) {
    // Try splitting on periods
    return explanation
      .split(/\.\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 10)
      .map((l) => (l.endsWith('.') ? l : l + '.'));
  }
  return lines;
}

interface SimilarityBarProps {
  label: string;
  value: number;
  isWinner: boolean;
  imageUri?: string;
}

function SimilarityBar({ label, value, isWinner, imageUri }: SimilarityBarProps) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const pctText = pct.toFixed(0) + '%';
  const barColor = isWinner ? colors.secondary : colors.textSecondary;
  const imageSource = resolveImageSource(imageUri);

  return (
    <View style={barStyles.container}>
      <View style={barStyles.header}>
        {imageUri ? (
          <Image source={imageSource} style={barStyles.avatar} resizeMode="cover" />
        ) : (
          <View style={[barStyles.avatar, { backgroundColor: colors.cardDark }]} />
        )}
        <View style={barStyles.labelRow}>
          <Text style={barStyles.label} numberOfLines={1}>
            {label}
          </Text>
          {isWinner && <Text style={barStyles.winnerTag}>VINCITORE</Text>}
        </View>
        <Text style={[barStyles.pctText, { color: barColor }]}>{pctText}</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
  },
  labelRow: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  winnerTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    backgroundColor: colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pctText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  track: {
    height: 10,
    backgroundColor: colors.cardDark,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});

export default function ComparisonResultScreen() {
  const params = useLocalSearchParams<{
    winner: string;
    similarity1: string;
    similarity2: string;
    explanation: string;
    name1: string;
    name2: string;
    mainUri: string;
    comp1Uri: string;
    comp2Uri: string;
  }>();
  const router = useRouter();

  const winner = Number(params.winner) || 1;
  const similarity1 = Number(params.similarity1) || 0;
  const similarity2 = Number(params.similarity2) || 0;
  const explanation = params.explanation || '';
  const name1 = params.name1 || 'Foto 1';
  const name2 = params.name2 || 'Foto 2';
  const mainUri = params.mainUri || '';
  const comp1Uri = params.comp1Uri || '';
  const comp2Uri = params.comp2Uri || '';

  const isWinner1 = winner === 1;
  const isWinner2 = winner === 2;

  const winnerName = isWinner1 ? name1 : name2;
  const winnerUri = isWinner1 ? comp1Uri : comp2Uri;
  const winnerSim = isWinner1 ? similarity1 : similarity2;
  const loserName = isWinner1 ? name2 : name1;
  const loserUri = isWinner1 ? comp2Uri : comp1Uri;
  const loserSim = isWinner1 ? similarity2 : similarity1;

  const bullets = parseExplanationBullets(explanation);

  const mainImageSource = resolveImageSource(mainUri);
  const winnerImageSource = resolveImageSource(winnerUri);
  const loserImageSource = resolveImageSource(loserUri);

  const winnerSimText = winnerSim.toFixed(0) + '%';
  const loserSimText = loserSim.toFixed(0) + '%';

  const handleNewAnalysis = () => {
    console.log('[ComparisonResult] User tapped Nuova analisi');
    router.replace('/(tabs)/(home)');
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundDark]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                console.log('[ComparisonResult] User tapped back');
                router.back();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>← Indietro</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>GARA</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* ── Main photo ── */}
          <View style={styles.mainPhotoSection}>
            <Text style={styles.sectionLabel}>Foto principale</Text>
            <View style={styles.mainPhotoWrapper}>
              <Image
                source={mainImageSource}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                style={styles.mainPhotoGradient}
              />
            </View>
          </View>

          {/* ── VS row ── */}
          <View style={styles.vsRow}>
            <View style={styles.vsDividerLine} />
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.vsDividerLine} />
          </View>

          {/* ── Contenders side by side ── */}
          <View style={styles.contendersRow}>
            {/* Contender 1 */}
            <View style={[styles.contenderCard, isWinner1 && styles.contenderCardWinner]}>
              {isWinner1 && (
                <View style={styles.crownBadge}>
                  <Text style={styles.crownEmoji}>👑</Text>
                </View>
              )}
              <Image
                source={resolveImageSource(comp1Uri)}
                style={styles.contenderImage}
                resizeMode="cover"
              />
              <Text style={styles.contenderName} numberOfLines={1}>
                {name1}
              </Text>
              <Text style={[styles.contenderSim, { color: isWinner1 ? colors.secondary : colors.textSecondary }]}>
                {similarity1.toFixed(0)}%
              </Text>
              {isWinner1 && <Text style={styles.winnerLabel}>VINCITORE</Text>}
            </View>

            {/* Contender 2 */}
            <View style={[styles.contenderCard, isWinner2 && styles.contenderCardWinner]}>
              {isWinner2 && (
                <View style={styles.crownBadge}>
                  <Text style={styles.crownEmoji}>👑</Text>
                </View>
              )}
              <Image
                source={resolveImageSource(comp2Uri)}
                style={styles.contenderImage}
                resizeMode="cover"
              />
              <Text style={styles.contenderName} numberOfLines={1}>
                {name2}
              </Text>
              <Text style={[styles.contenderSim, { color: isWinner2 ? colors.secondary : colors.textSecondary }]}>
                {similarity2.toFixed(0)}%
              </Text>
              {isWinner2 && <Text style={styles.winnerLabel}>VINCITORE</Text>}
            </View>
          </View>

          {/* ── Winner announcement ── */}
          <LinearGradient
            colors={[colors.secondary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.winnerBanner}
          >
            <Text style={styles.winnerBannerEmoji}>🏆</Text>
            <View style={styles.winnerBannerText}>
              <Text style={styles.winnerBannerLabel}>Somiglia di più a</Text>
              <Text style={styles.winnerBannerName}>{winnerName}</Text>
            </View>
            <Text style={styles.winnerBannerPct}>{winnerSimText}</Text>
          </LinearGradient>

          {/* ── Similarity bars ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Somiglianza</Text>
            <SimilarityBar
              label={name1}
              value={similarity1}
              isWinner={isWinner1}
              imageUri={comp1Uri}
            />
            <SimilarityBar
              label={name2}
              value={similarity2}
              isWinner={isWinner2}
              imageUri={comp2Uri}
            />
          </View>

          {/* ── Explanation bullets ── */}
          {bullets.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Analisi dettagliata</Text>
              {bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Raw explanation fallback if no bullets ── */}
          {bullets.length === 0 && explanation.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Spiegazione</Text>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}

          {/* ── Nuova analisi button ── */}
          <TouchableOpacity
            style={styles.newAnalysisBtn}
            onPress={handleNewAnalysis}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newAnalysisGradient}
            >
              <Text style={styles.newAnalysisBtnEmoji}>🔄</Text>
              <Text style={styles.newAnalysisBtnText}>Nuova analisi</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const CONTENDER_IMG = (screenWidth - 40 - 12) / 2;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 80,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 3,
  },

  // Main photo
  mainPhotoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainPhotoWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  mainPhoto: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 0.75,
  },
  mainPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  // VS
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  vsDividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
  },

  // Contenders
  contendersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contenderCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  contenderCardWinner: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(252, 211, 77, 0.08)',
  },
  crownBadge: {
    position: 'absolute',
    top: -14,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 28,
  },
  contenderImage: {
    width: CONTENDER_IMG - 24,
    height: CONTENDER_IMG - 24,
    borderRadius: 14,
    backgroundColor: colors.cardDark,
  },
  contenderName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  contenderSim: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  winnerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },

  // Winner banner
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  winnerBannerEmoji: {
    fontSize: 32,
  },
  winnerBannerText: {
    flex: 1,
    gap: 2,
  },
  winnerBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
    opacity: 0.75,
  },
  winnerBannerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background,
  },
  winnerBannerPct: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.background,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.secondary,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  explanationText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },

  // New analysis button
  newAnalysisBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  newAnalysisGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  newAnalysisBtnEmoji: {
    fontSize: 20,
  },
  newAnalysisBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
