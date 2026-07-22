/**
 * Donation Monitoring Screen – Admin.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons, StatusColors } from '../../utils/theme';

const FILTERS = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];

export default function DonationMonitoringScreen() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadDonations(); }, [filter]);

  const loadDonations = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data: res } = await adminAPI.getDonations(params);
      if (res.success) {
        setDonations(res.data?.donations || []);
      }
    } catch (e) {
      console.warn('Failed to load donations in monitor:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <Text style={styles.headerTitle}>Donation Monitor 🎁</Text>
        <Text style={styles.headerSub}>{donations.length} donations loaded</Text>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDonations} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.emoji}>{DonationTypeIcons[item.category] || '🎁'}</Text>
                <View style={styles.info}>
                  <Text style={styles.resource}>{item.category?.toUpperCase()} – {item.quantity}</Text>
                  <Text style={styles.meta}>Donor: {item.donorId?.name || 'Unknown'} · NGO: {item.assignedNgoId?.name || 'Unmatched'}</Text>
                  <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: (StatusColors[item.status] || Colors.primary) + '20' }]}>
                    <Text style={[styles.statusText, { color: StatusColors[item.status] || Colors.primary }]}>{item.status}</Text>
                  </View>
                  {item.isEmergency && <Text style={styles.emergencyTag}>🚨 EMERGENCY</Text>}
                  {item.blockchainTxHash && <Text style={styles.chainTag}>⛓️ On-Chain</Text>}
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}><Text style={styles.emptyIcon}>📭</Text><Text style={styles.emptyText}>No donations found</Text></View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: '#9CA3AF', marginTop: 2, marginBottom: Spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: '#FFF', fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  resource: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  meta: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  date: { color: Colors.textLight, fontSize: Typography.fontSize.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  emergencyTag: { fontSize: 10, color: Colors.emergency, fontWeight: '700' },
  chainTag: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 64 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.fontSize.lg, fontWeight: '600' },
});
