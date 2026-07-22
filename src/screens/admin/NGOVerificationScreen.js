/**
 * NGO Verification Panel – Admin approves/rejects NGOs.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

export default function NGOVerificationScreen() {
  const [pendingNGOs, setPendingNGOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data: res } = await adminAPI.getPendingNGOs();
      if (res.success) {
        setPendingNGOs(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load pending NGOs:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (ngo) =>
    Alert.alert('Approve NGO?', `Approve "${ngo.name}"? They will be notified immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve ✅', onPress: async () => {
          setActionLoading(ngo._id);
          try {
            await adminAPI.verifyNGO(ngo._id, 'approved');
            Alert.alert('Approved! ✅', `${ngo.name} has been approved.`);
            loadPending();
          } finally { setActionLoading(null); }
        }
      },
    ]);

  const handleReject = (ngo) =>
    Alert.prompt(
      'Reject NGO',
      `Enter rejection reason for "${ngo.name}":`,
      async (reason) => {
        if (!reason) return;
        setActionLoading(ngo._id);
        try {
          await adminAPI.verifyNGO(ngo._id, 'rejected', reason);
          Alert.alert('Rejected', `${ngo.name} has been notified.`);
          loadPending();
        } finally { setActionLoading(null); }
      },
      'plain-text', '', 'default'
    );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.ngoName}>{item.name}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>PENDING</Text>
        </View>
      </View>

      {item.ngoDetails?.description && (
        <Text style={styles.desc} numberOfLines={3}>{item.ngoDetails.description}</Text>
      )}

      <View style={styles.meta}>
        {item.ngoDetails?.registrationNumber && (
          <View style={styles.metaItem}>
            <Ionicons name="document-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>Reg: {item.ngoDetails.registrationNumber}</Text>
          </View>
        )}
        {item.address && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.address}</Text>
          </View>
        )}
        {item.email && (
          <View style={styles.metaItem}>
            <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.email}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)} disabled={actionLoading === item._id}>
          {actionLoading === item._id
            ? <ActivityIndicator color="#FFF" size="small" />
            : <>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)} disabled={actionLoading === item._id}>
          <Ionicons name="close-circle-outline" size={18} color={Colors.error} style={{ marginRight: 4 }} />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <Text style={styles.headerTitle}>NGO Verification 🏢</Text>
        <Text style={styles.headerSub}>{pendingNGOs.length} NGOs awaiting review</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={pendingNGOs}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>No NGOs pending verification</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: '#9CA3AF', marginTop: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  ngoName: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: Colors.text, flex: 1, marginRight: Spacing.sm },
  pendingBadge: { backgroundColor: Colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  pendingText: { color: Colors.warning, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  desc: { color: Colors.textSecondary, fontSize: Typography.fontSize.md, marginBottom: Spacing.md, lineHeight: 20 },
  meta: { gap: Spacing.sm, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.md },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: BorderRadius.md, padding: Spacing.md },
  approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.md },
  rejectBtnText: { color: Colors.error, fontWeight: '700', fontSize: Typography.fontSize.md },
  empty: { alignItems: 'center', padding: Spacing['3xl'] },
  emptyIcon: { fontSize: 80, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, marginTop: 4, fontSize: Typography.fontSize.md },
});
