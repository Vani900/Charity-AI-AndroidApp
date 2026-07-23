/**
 * NGO Analytics Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ngosAPI, getRequests } from '../../services/api';
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
      .catch((e) => console.warn(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  // Extract counts
  const totalVal = stats.find(s => s.l === 'Total Donations')?.v || '0';
  const pendingVal = stats.find(s => s.l === 'Pending')?.v || '0';
  const deliveredVal = stats.find(s => s.l === 'Delivered')?.v || '0';
  const successRate = stats.find(s => s.l === 'Success Rate')?.v || '0%';

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>NGO Analytics 📊</Text>
        <Text style={styles.headerSub}>Track your impact and performance</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* KPI Cards Grid */}
        <View style={styles.statusGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statusCard, { borderTopColor: s.color || Colors.primary, borderTopWidth: 3 }]}>
              <Text style={[styles.statusCount, { color: s.color || Colors.primary }]}>{s.v}</Text>
              <Text style={styles.statusLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Resources Distribution Progress Chart */}
        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Donations By Resource Type</Text>
          {[
            { label: 'Food Intake Match', ratio: 0.65, count: '65%', color: Colors.primary },
            { label: 'Clothes Distribution', ratio: 0.20, count: '20%', color: Colors.warning },
            { label: 'Books Fulfillment', ratio: 0.10, count: '10%', color: Colors.info },
            { label: 'Money Funding', ratio: 0.05, count: '5%', color: Colors.error },
          ].map((item, idx) => (
            <View key={idx} style={styles.resourceRow}>
              <View style={styles.resourceTop}>
                <Text style={styles.resourceLabel}>{item.label}</Text>
                <Text style={styles.resourceCount}>{item.count}</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${item.ratio * 100}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Monthly Donation Activity Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Activity Log</Text>
          <View style={styles.activityGraphRow}>
            {[
              { month: 'Mar', height: 40 },
              { month: 'Apr', height: 65 },
              { month: 'May', height: 50 },
              { month: 'Jun', height: 90 },
              { month: 'Jul', height: 75 },
            ].map((d, i) => (
              <View key={i} style={styles.graphBarWrapper}>
                <View style={styles.graphBarTrack}>
                  <View style={[styles.graphBarFill, { height: `${d.height}%`, backgroundColor: Colors.primary }]} />
                </View>
                <Text style={styles.graphMonthText}>{d.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Beneficiaries Helped (Fallback message) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beneficiaries Helped</Text>
          <Text style={styles.analyticsText}>Beneficiary tracking is currently not supported by the backend REST service.</Text>
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
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  resourceRow: { marginBottom: Spacing.md },
  resourceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resourceLabel: { fontWeight: '600', color: Colors.text, fontSize: 13 },
  resourceCount: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  bar: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', ...Shadows.sm },
  statusCount: { fontSize: Typography.fontSize.xl, fontWeight: '800' },
  statusLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  activityGraphRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingTop: Spacing.lg },
  graphBarWrapper: { alignItems: 'center', flex: 1 },
  graphBarTrack: { width: 14, height: 100, backgroundColor: Colors.border, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  graphBarFill: { width: '100%', borderRadius: 7 },
  graphMonthText: { fontSize: 10, color: Colors.textSecondary, marginTop: Spacing.xs, fontWeight: '600' },
  analyticsText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
});
