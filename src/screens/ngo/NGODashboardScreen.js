/**
 * NGO Dashboard Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ngosAPI, authAPI, donationsAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, StatusColors, DonationTypeIcons } from '../../utils/theme';

const URGENCY_COLORS = { low: Colors.success, medium: Colors.warning, high: Colors.accentOrange, critical: Colors.emergency };

export default function NGODashboardScreen({ navigation }) {
  const { user } = useSelector((s) => s.auth);
  const [ngo, setNgo] = useState(null);
  const [stats, setStats] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      setError(null);
      const [profileRes, dashRes, reqsRes] = await Promise.all([
        authAPI.getMe(),
        ngosAPI.getDashboard(),
        ngosAPI.getRequirements(),
      ]);
      const currentNgo = profileRes.data?.data || null;
      setNgo(currentNgo);
      setRequirements(reqsRes.data?.data || reqsRes.data || []);

      const fetchedStats = [...(dashRes.data?.data?.stats || [])];
      const requirementsCount = (reqsRes.data?.data || reqsRes.data || []).length;
      if (fetchedStats.length >= 3) {
        fetchedStats.push({
          v: requirementsCount.toString(),
          l: 'Active Requirements',
          color: '#8B5CF6',
          bg: 'rgba(139, 92, 246, 0.15)',
        });
      }
      setStats(fetchedStats);

      // Load filtered donation requests
      if (filter === 'pending') {
        setDonations(dashRes.data?.data?.requests || []);
      } else {
        const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
        const activeIds = JSON.parse(storedStr);
        const list = [];
        for (const id of activeIds) {
          try {
            const { data: res } = await donationsAPI.getTracking(id);
            if (res.success && res.data?.donationId) {
              const d = res.data.donationId;
              if (filter === 'accepted' && ['accepted', 'in_transit', 'delivered', 'verified'].includes(d.status)) {
                list.push(d);
              } else if (filter === 'rejected' && d.status === 'cancelled') {
                list.push(d);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch cached donation ${id}:`, err.message);
          }
        }
        setDonations(list);
      }
    } catch (e) {
      console.warn('Failed to load NGO dashboard:', e.message);
      setError('Failed to refresh data from server.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await ngosAPI.updateStatus(id, status, `Status changed via mobile dashboard overview.`);
      
      // Cache the accepted/rejected ones locally to track status filters correctly
      const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
      const activeIds = JSON.parse(storedStr);
      if (!activeIds.includes(id)) {
        activeIds.push(id);
        await AsyncStorage.setItem('ngo_accepted_donations', JSON.stringify(activeIds));
      }

      Alert.alert('Success ✅', `Request status updated to ${status}.`);
      loadData();
    } catch (e) {
      console.warn('Failed to update request:', e.message);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update donation request.');
    } finally {
      setUpdatingId(null);
    }
  };

  const viewRequestDetails = (d) => {
    Alert.alert(
      `${d.category?.toUpperCase()} Donation Details`,
      `Quantity: ${d.quantity}\nDonor: ${d.donorId?.name || 'Anonymous'}\nPhone: ${d.donorId?.phone || 'Private'}\nDescription: ${d.description || 'No description provided.'}\nStatus: ${d.status}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const isNgoVerified = true;
  const approvalStatus = ngo?.approvalStatus || 'pending';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.ngoName}>{ngo?.name || 'NGO'} 🏢</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statusBadgeText}>APPROVED</Text>
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
            style={styles.createBtn} 
            onPress={() => navigation.navigate('Requirements')}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {requirements.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No active requirements yet</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('Requirements')}>
              <Text style={styles.emptyCreateBtnText}>Create Requirement</Text>
            </TouchableOpacity>
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

        {/* Donation Requests with accept, reject, pending tabs */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl, marginBottom: Spacing.md }]}>
          <Text style={styles.sectionTitle}>Donation Requests</Text>
          <View style={styles.filterRow}>
            {['pending', 'accepted', 'rejected'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {donations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>No {filter} requests available</Text>
          </View>
        ) : (
          donations.map((d) => (
            <View key={d._id} style={styles.donationCard}>
              <View style={styles.donTopRow}>
                <Text style={styles.donEmoji}>{DonationTypeIcons[d.category] || '🎁'}</Text>
                <View style={styles.donInfo}>
                  <Text style={styles.donTitle}>{(d.category || 'Donation')?.toUpperCase()} – {d.quantity}</Text>
                  <Text style={styles.donDonor}>Donor: {d.donorId?.name || 'Anonymous'}</Text>
                  {d.donorId?.phone && <Text style={styles.donPhone}>📞 {d.donorId.phone}</Text>}
                  <Text style={styles.donDate}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent'}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: (StatusColors[d.status] || Colors.primary) + '20' }]}>
                  <Text style={[styles.statusTagText, { color: StatusColors[d.status] || Colors.primary }]}>{d.status}</Text>
                </View>
              </View>

              <View style={styles.donActions}>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => viewRequestDetails(d)}>
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </TouchableOpacity>

                {d.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.acceptBtn]} 
                      onPress={() => handleUpdateStatus(d._id, 'accepted')}
                      disabled={updatingId === d._id}
                    >
                      {updatingId === d._id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]} 
                      onPress={() => handleUpdateStatus(d._id, 'cancelled')}
                      disabled={updatingId === d._id}
                    >
                      {updatingId === d._id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                    </TouchableOpacity>
                  </>
                )}

                {d.status === 'accepted' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: Colors.info }]} 
                      onPress={() => handleUpdateStatus(d._id, 'in_transit')}
                    >
                      <Text style={styles.acceptBtnText}>In Transit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.acceptBtn]} 
                      onPress={() => handleUpdateStatus(d._id, 'delivered')}
                    >
                      <Text style={styles.acceptBtnText}>Deliver</Text>
                    </TouchableOpacity>
                  </>
                )}

                {d.status === 'in_transit' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]} 
                    onPress={() => handleUpdateStatus(d._id, 'delivered')}
                  >
                    <Text style={styles.acceptBtnText}>Confirm Delivery</Text>
                  </TouchableOpacity>
                )}

                {d.status !== 'pending' && d.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => navigation.navigate('Requests', { screen: 'DonationChat', params: { donationId: d._id } })}
                  >
                    <Ionicons name="chatbubbles-outline" size={14} color={Colors.primary} />
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                )}
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
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  errorText: { color: Colors.emergency, fontWeight: '600', fontSize: Typography.fontSize.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },
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
  donationCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  donTopRow: { flexDirection: 'row', gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  donEmoji: { fontSize: 36 },
  donInfo: { flex: 1 },
  donTitle: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  donDonor: { fontSize: Typography.fontSize.sm, color: Colors.text, marginTop: 2 },
  donPhone: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  donDate: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  statusTagText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  donActions: { flexDirection: 'row', gap: Spacing.xs, paddingTop: Spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  detailsBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  detailsBtnText: { color: Colors.text, fontWeight: '600', fontSize: Typography.fontSize.xs },
  acceptBtn: { backgroundColor: Colors.success },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.xs },
  rejectBtn: { backgroundColor: Colors.emergency },
  rejectBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.xs },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  filterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 4 },
  chatBtnText: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
});
