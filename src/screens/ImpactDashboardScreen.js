/**
 * Impact Dashboard Screen – charts, stats, monthly trends.
 */

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalyticsSummary, fetchMonthlyTrend } from '../redux/slices/analyticsSlice';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons } from '../utils/theme';

const { width } = Dimensions.get('window');

const RESOURCE_COLORS = {
  money: Colors.money,
  food: Colors.food,
  clothes: Colors.clothes,
  books: Colors.books,
  medicines: Colors.medicines,
  blood: Colors.blood,
};

function SimpleBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.donations), 1);
  const barWidth = (width - Spacing.xl * 2 - Spacing.md * (data.length - 1)) / data.length;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {data.map((item, idx) => (
          <View key={idx} style={[chartStyles.barGroup, { width: barWidth }]}>
            <View style={chartStyles.barWrap}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                style={[chartStyles.bar, { height: Math.max(4, (item.donations / maxVal) * 120) }]}
              />
            </View>
            <Text style={chartStyles.barLabel} numberOfLines={1}>{item.month.split(' ')[0]}</Text>
            <Text style={chartStyles.barVal}>{item.donations}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: Spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, height: 140 },
  barGroup: { alignItems: 'center' },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { borderRadius: 4, width: '100%' },
  barLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  barVal: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
});

export default function ImpactDashboardScreen() {
  const dispatch = useDispatch();
  const { summary, monthlyTrend, isLoading } = useSelector((s) => s.analytics);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchMonthlyTrend());
  }, []);

  const byResource = summary?.donations_by_resource || {};
  const totalDonations = summary?.total_donations || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Your Impact 🌟</Text>
        <Text style={styles.headerSub}>See how your generosity is changing lives</Text>

        <View style={styles.impactMessage}>
          <Text style={styles.impactMessageText}>
            {summary?.message || '🌱 Start donating to make an impact!'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Key Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Donations', value: summary?.total_donations || 0, icon: '🎁', color: Colors.primary },
            { label: 'People Helped', value: summary?.people_helped || 0, icon: '🤝', color: Colors.success },
            { label: 'Verified', value: summary?.verified_donations || 0, icon: '✅', color: Colors.info },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Donations</Text>
          <SimpleBarChart data={monthlyTrend} />
        </View>

        {/* Resource Breakdown */}
        {Object.keys(byResource).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donations by Type</Text>
            {Object.entries(byResource).map(([resource, count]) => {
              const pct = totalDonations > 0 ? (count / totalDonations) * 100 : 0;
              const color = RESOURCE_COLORS[resource] || Colors.primary;
              return (
                <View key={resource} style={styles.resourceRow}>
                  <Text style={styles.resourceIcon}>{DonationTypeIcons[resource]}</Text>
                  <View style={styles.resourceInfo}>
                    <View style={styles.resourceHeader}>
                      <Text style={styles.resourceLabel}>{resource}</Text>
                      <Text style={styles.resourceCount}>{count} donations</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Blockchain Impact */}
        <View style={[styles.section, styles.blockchainSection]}>
          <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
          <Text style={styles.blockchainTitle}>Blockchain Verified</Text>
          <Text style={styles.blockchainText}>
            All your verified donations are permanently recorded on the Ethereum blockchain for complete transparency and immutability.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.md, marginTop: 4 },
  impactMessage: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  impactMessageText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md, textAlign: 'center' },
  content: { padding: Spacing.lg },
  statsGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', ...Shadows.sm,
  },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm,
  },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  resourceIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  resourceInfo: { flex: 1 },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resourceLabel: { fontWeight: '600', color: Colors.text, textTransform: 'capitalize', fontSize: Typography.fontSize.md },
  resourceCount: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  progressBar: { height: 8, backgroundColor: Colors.divider, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  blockchainSection: { alignItems: 'center', gap: Spacing.sm },
  blockchainTitle: { fontWeight: '800', color: Colors.text, fontSize: Typography.fontSize.xl },
  blockchainText: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, fontSize: Typography.fontSize.md },
});
