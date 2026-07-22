/**
 * NGO Dashboard Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { ngosAPI, authAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, StatusColors, DonationTypeIcons } from '../../utils/theme';

export default function NGODashboardScreen() {
  const { user } = useSelector((s) => s.auth);
  const [ngo, setNgo] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, dashRes] = await Promise.all([
        authAPI.getMe(),
        ngosAPI.getDashboard(),
      ]);
      setNgo(profileRes.data?.data || null);
      setDonations(dashRes.data?.data?.requests || []);
      setStats(dashRes.data?.data?.stats || []);
    } catch (e) {
      console.warn('Failed to load NGO dashboard:', e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const getStatusBg = (status) => ({ backgroundColor: (StatusColors[status] || Colors.primary) + '20' });
  const getStatusColor = (status) => ({ color: StatusColors[status] || Colors.primary });

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.ngoName}>{ngo?.name || 'NGO'} 🏢</Text>
        <View style={[styles.statusBadge, { backgroundColor: ngo?.approvalStatus === 'approved' ? '#10B981' : '#F59E0B' }]}>
          <Text style={styles.statusBadgeText}>{(ngo?.approvalStatus || 'pending').toUpperCase()}</Text>
        </View>
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg || 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.statValue, { color: s.color || '#FFF' }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {ngo?.approvalStatus !== 'approved' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={24} color={Colors.warning} />
            <View style={styles.pendingText}>
              <Text style={styles.pendingTitle}>Verification Pending</Text>
              <Text style={styles.pendingSub}>Your NGO is under review. You'll be notified once approved.</Text>
            </View>
          </View>
        )}

        {/* Recent Donations */}
        <Text style={styles.sectionTitle}>Recent Pending Donations</Text>
        {donations.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyIcon}>📭</Text><Text style={styles.emptyText}>No pending donations assigned</Text></View>
        ) : donations.map((d) => (
          <View key={d._id} style={styles.donationCard}>
            <Text style={styles.donationEmoji}>{DonationTypeIcons[d.category] || '🎁'}</Text>
            <View style={styles.donationInfo}>
              <Text style={styles.donationTitle}>{(d.category || 'Donation')?.toUpperCase()} – {d.quantity}</Text>
              <Text style={styles.donationDate}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent'}</Text>
            </View>
            <View style={[styles.donStatusBadge, getStatusBg(d.status)]}>
              <Text style={[styles.donStatusText, getStatusColor(d.status)]}>{d.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  welcome: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.md },
  ngoName: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF', marginVertical: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
  statusBadgeText: { color: '#FFF', fontSize: Typography.fontSize.xs, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  content: { padding: Spacing.lg },
  pendingBanner: { flexDirection: 'row', gap: Spacing.md, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  pendingText: { flex: 1 },
  pendingTitle: { fontWeight: '700', color: Colors.warning, fontSize: Typography.fontSize.md },
  pendingSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionCard: { flex: 1, minWidth: '22%', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md },
  actionCount: { fontSize: Typography.fontSize.xl, fontWeight: '800' },
  actionLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', textTransform: 'capitalize' },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  empty: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.sm },
  donationCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  donationEmoji: { fontSize: 28 },
  donationInfo: { flex: 1 },
  donationTitle: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  donationDate: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  donStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  donStatusText: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
});
