/**
 * Analytics Dashboard – Admin platform-wide stats.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons, StatusColors } from '../../utils/theme';

export default function AnalyticsDashboardScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, donRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getDonations()
      ]);

      const stats = dashRes.data?.data || {};
      const donationsList = donRes.data?.data?.donations || [];

      const byResource = {};
      const byStatus = {};

      donationsList.forEach((d) => {
        const cat = d.category || 'other';
        byResource[cat] = (byResource[cat] || 0) + 1;

        const stat = d.status || 'pending';
        byStatus[stat] = (byStatus[stat] || 0) + 1;
      });

      setAnalytics({
        total_donations: stats.donations || donationsList.length,
        total_users: stats.users || 0,
        total_ngos: stats.ngos || 0,
        total_verified: donationsList.filter(d => d.status === 'delivered').length,
        donations_by_resource: byResource,
        donations_by_status: byStatus,
      });
    } catch (e) {
      console.warn('Failed to compute analytics:', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const byResource = analytics?.donations_by_resource || {};
  const byStatus = analytics?.donations_by_status || {};
  const total = analytics?.total_donations || 1;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <Text style={styles.headerTitle}>Platform Analytics 📊</Text>
        <Text style={styles.headerSub}>CharityChain AI overall performance</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Top Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Donations', value: analytics?.total_donations || 0, icon: '🎁', color: Colors.primary },
            { label: 'Total Users', value: analytics?.total_users || 0, icon: '👤', color: Colors.info },
            { label: 'Active NGOs', value: analytics?.total_ngos || 0, icon: '🏢', color: Colors.success },
            { label: 'Verified', value: analytics?.total_verified || 0, icon: '✅', color: Colors.success },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Donations by Resource */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donations by Resource Type</Text>
          {Object.entries(byResource).sort((a, b) => b[1] - a[1]).map(([res, count]) => {
            const pct = (count / total) * 100;
            return (
              <View key={res} style={styles.resourceRow}>
                <Text style={styles.resEmoji}>{DonationTypeIcons[res]}</Text>
                <View style={styles.resInfo}>
                  <View style={styles.resTop}>
                    <Text style={styles.resName}>{res}</Text>
                    <Text style={styles.resCount}>{count} ({Math.round(pct)}%)</Text>
                  </View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Donations by Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donations by Status</Text>
          <View style={styles.statusGrid}>
            {Object.entries(byStatus).map(([status, count]) => (
              <View key={status} style={[styles.statusCard, { borderLeftColor: StatusColors[status] || Colors.primary, borderLeftWidth: 3 }]}>
                <Text style={[styles.statusValue, { color: StatusColors[status] || Colors.primary }]}>{count}</Text>
                <Text style={styles.statusName}>{status.replace('_', '\n')}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: '#9CA3AF', marginTop: 4 },
  content: { padding: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadows.sm },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  resEmoji: { fontSize: 28, width: 36 },
  resInfo: { flex: 1 },
  resTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resName: { fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  resCount: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  bar: { height: 8, backgroundColor: Colors.divider, borderRadius: 4 },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusCard: { width: '30%', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  statusValue: { fontSize: Typography.fontSize.xl, fontWeight: '800' },
  statusName: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', marginTop: 2, textTransform: 'capitalize' },
});
