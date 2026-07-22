/**
 * NGO Analytics Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ngosAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons } from '../../utils/theme';

export default function NGOAnalyticsScreen() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ngosAPI.getDashboard()
      .then(({ data: res }) => {
        if (res.success && res.data) {
          setStats(res.data.stats || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>NGO Analytics 📊</Text>
        <Text style={styles.headerSub}>Track your impact and performance</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Analytics Stats Grid */}
        <View style={styles.statusGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statusCard, { borderTopColor: s.color || Colors.primary, borderTopWidth: 3 }]}>
              <Text style={[styles.statusCount, { color: s.color || Colors.primary }]}>{s.v}</Text>
              <Text style={styles.statusLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { padding: Spacing.lg },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadows.sm },
  summaryIcon: { fontSize: 32, marginBottom: Spacing.sm },
  summaryValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  summaryLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  resourceEmoji: { fontSize: 28, width: 36 },
  resourceInfo: { flex: 1 },
  resourceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resourceLabel: { fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  resourceCount: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  bar: { height: 8, backgroundColor: Colors.divider, borderRadius: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusCard: { flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  statusCount: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.primary },
  statusLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', textTransform: 'capitalize', marginTop: 2 },
});
