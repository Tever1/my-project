import React, { ReactNode, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { Colors, Radius } from '@/lib/colors';
import { useTranslation } from '@/lib/i18n';

interface GameLayoutProps {
  children: ReactNode;
  title: string;
  icon: string;
  round?: number;
  totalRounds?: number;
  scores?: { name: string; score: number }[];
  onEnd?: () => void;
  showScoreboard?: boolean;
}

export function GameLayout({
  children,
  title,
  icon,
  round,
  totalRounds,
  scores,
  onEnd,
  showScoreboard = false,
}: GameLayoutProps) {
  const { t } = useTranslation();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  const sortedScores = scores
    ? [...scores].sort((a, b) => b.score - a.score)
    : [];

  return (
    <LinearGradient
      colors={['#0c0a15', '#1a1035', '#0f172a', '#0c0a15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.icon}>{icon}</Text>
            <View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {round != null && totalRounds != null && (
                <Text style={styles.subtitle}>
                  {t('game.round')} {round} / {totalRounds}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            {showScoreboard && sortedScores.length > 0 && (
              <Pressable
                onPress={() => setScoreboardOpen(true)}
                style={styles.scoreToggle}
              >
                <Text style={styles.scoreToggleText}>🏆 {sortedScores.length}</Text>
              </Pressable>
            )}
            {onEnd && (
              <GlassButton variant="danger" size="sm" onPress={onEnd}>
                {t('game.end')}
              </GlassButton>
            )}
          </View>
        </View>

        {/* Score Modal */}
        <Modal
          visible={scoreboardOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setScoreboardOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setScoreboardOpen(false)}>
            <View style={styles.modalContent}>
              <GlassCard style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>🏆 {t('game.scoreboard')}</Text>
                {sortedScores.map((entry, i) => (
                  <View key={entry.name} style={styles.scoreRow}>
                    <View style={styles.scoreRowLeft}>
                      <Text style={styles.scoreRank}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </Text>
                      <Text style={styles.scoreName} numberOfLines={1}>{entry.name}</Text>
                    </View>
                    <GlassBadge>
                      <Text style={styles.scoreValue}>{entry.score}</Text>
                    </GlassBadge>
                  </View>
                ))}
              </GlassCard>
            </View>
          </Pressable>
        </Modal>

        {/* Main content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  scoreToggle: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  scoreToggleText: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
  },
  scoreCard: {
    padding: 20,
  },
  scoreTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scoreRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scoreRank: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  scoreName: {
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  scoreValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
