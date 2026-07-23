/**
 * NGO Dashboard Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { ngosAPI, authAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, StatusColors, DonationTypeIcons } from '../../utils/theme';

const URGENCY_COLORS = { low: Colors.success, medium: Colors.warning, high: Colors.accentOrange, critical: Colors.emergency };

export default function NGODashboardScreen({ navigation }) {
  const { user } = useSelector((s) => s.auth);
  const [ngo, setNgo] = useState(null);
  const [stats, setStats] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [profileRes, dashRes, reqsRes] = await Promise.all([
        authAPI.getMe(),
        ngosAPI.getDashboard(),
        ngosAPI.getRequirements(),
      ]);
      setNgo(profileRes.data?.data || null);
      setStats(dashRes.data?.data?.stats || []);
      setRequirements(reqsRes.data?.data || reqsRes.data || []);
    } catch (e) {
      console.warn('Failed to load NGO dashboard:', e.message);
      setError('Failed to refresh data from server.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const isNgoVerified = ngo?.approvalStatus === 'approved';

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.ngoName}>{ngo?.name || 'NGO'} 🏢</Text>
        <View style={[styles.statusBadge, { backgroundColor: isNgoVerified ? '#10B981' : '#F59E0B' }]}>
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

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.emergency} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Active Resource Requirements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Resource Requirements</Text>
          <TouchableOpacity 
            style={[styles.createBtn, !isNgoVerified && styles.disabledBtn]} 
            onPress={() => {
              if (!isNgoVerified) {
                Alert.alert('Verification Pending', 'You will be able to create requirements once your NGO is approved by the admin.');
                return;
              }
              navigation.navigate('Requirements');
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {requirements.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No active requirements yet</Text>
            {isNgoVerified && (
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('Requirements')}>
                <Text style={styles.emptyCreateBtnText}>Create Requirement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          requirements.map((r) => (
            <View key={r._id} style={styles.requirementCard}>
              <View style={styles.reqTopRow}>
                <View style={styles.reqResourceWrapper}>
                  <Text style={styles.reqIcon}>{DonationTypeIcons[r.category] || '🎁'}</Text>
                  <View>
                    <Text style={styles.reqCategory}>{r.category?.toUpperCase()}</Text>
                    <Text style={styles.reqQty}>{r.quantity}</Text>
                  </View>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: (URGENCY_COLORS[r.urgency] || Colors.primary) + '20' }]}>
                  <Text style={[styles.urgencyText, { color: URGENCY_COLORS[r.urgency] || Colors.primary }]}>{r.urgency}</Text>
                </View>
              </View>

              <View style={styles.reqDetails}>
                <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Location:</Text> {ngo?.address || 'Chennai'}</Text>
                {r.needByDate && (
                  <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Required Date:</Text> {new Date(r.needByDate).toLocaleDateString()}</Text>
                )}
                <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Status:</Text> <Text style={styles.statusText}>{r.status || 'open'}</Text></Text>
              </View>
            </View>
          ))
        )}

        {/* Recent Activity (Not Supported State) */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Recent Activity</Text>
        <View style={styles.activityBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.activityText}>Activity log is currently not supported by the backend service.</Text>
        </View>
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
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  content: { padding: Spacing.lg },
  pendingBanner: { flexDirection: 'row', gap: Spacing.md, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  pendingTitle: { fontWeight: '700', color: Colors.warning, fontSize: Typography.fontSize.md },
  pendingSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  errorText: { color: Colors.emergency, fontWeight: '600', fontSize: Typography.fontSize.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },
  disabledBtn: { backgroundColor: Colors.border, opacity: 0.6 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.sm },
  empty: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadows.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.sm, fontSize: Typography.fontSize.md, fontWeight: '600' },
  emptyCreateBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.md },
  emptyCreateBtnText: { color: '#FFF', fontWeight: '700' },
  requirementCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  reqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  reqResourceWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reqIcon: { fontSize: 32 },
  reqCategory: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  reqQty: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  reqDetails: { paddingTop: Spacing.sm },
  detailsText: { fontSize: Typography.fontSize.sm, color: Colors.text, marginVertical: 2 },
  detailsLabel: { fontWeight: '600', color: Colors.textSecondary },
  statusText: { textTransform: 'capitalize', color: Colors.primary, fontWeight: '700' },
  activityBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm },
  activityText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1 },
});
