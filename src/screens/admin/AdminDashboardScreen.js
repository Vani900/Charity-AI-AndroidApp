/**
 * Admin Dashboard Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const { data: res } = await adminAPI.getDashboard();
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn('Failed to load admin stats:', e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const statCards = [
    { label: 'Total Users', value: stats?.users || 0, icon: '👤', color: Colors.info },
    { label: 'Total NGOs', value: stats?.ngos || 0, icon: '🏢', color: Colors.success },
    { label: 'Pending NGOs', value: stats?.pendingNgos || 0, icon: '⏳', color: Colors.warning },
    { label: 'Total Donations', value: stats?.donations || 0, icon: '🎁', color: Colors.primary },
    { label: "Today's Donations", value: stats?.todayDonations || 0, icon: '📅', color: Colors.accent },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor={Colors.primary} />}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.adminBadge}>ADMIN PANEL</Text>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        </View>
        <Text style={styles.headerTitle}>CharityChain Admin</Text>
        <Text style={styles.headerSub}>Platform Management & Oversight</Text>
      </LinearGradient>

      <View style={styles.content}>
        {stats?.pendingNgos > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={22} color={Colors.warning} />
            <Text style={styles.alertText}>
              {stats.pendingNgos} NGO{stats.pendingNgos > 1 ? 's' : ''} pending verification
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { borderLeftColor: s.color, borderLeftWidth: 4 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {[
            { icon: 'checkmark-circle-outline', label: 'Review Pending NGOs', color: Colors.warning, note: `${stats?.pendingNgos || 0} waiting` },
            { icon: 'shield-outline', label: 'Fraud Detection', color: Colors.error, note: 'Review suspicious activity' },
            { icon: 'analytics-outline', label: 'Platform Analytics', color: Colors.info, note: 'View full reports' },
          ].map((item, i) => (
            <View key={i} style={styles.quickAction}>
              <Ionicons name={item.icon} size={24} color={item.color} />
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <Text style={styles.quickActionNote}>{item.note}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  adminBadge: { color: '#10B981', fontWeight: '700', fontSize: Typography.fontSize.xs, letterSpacing: 1.5 },
  headerTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  headerSub: { color: '#9CA3AF', fontSize: Typography.fontSize.md, marginTop: 4 },
  content: { padding: Spacing.lg },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  alertText: { fontWeight: '700', color: Colors.warning, flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  quickActionText: { flex: 1 },
  quickActionLabel: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  quickActionNote: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
});
