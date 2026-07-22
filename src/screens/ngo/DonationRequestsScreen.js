/**
 * NGO Donation Requests – accept/reject incoming donations.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ngosAPI, donationsAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons, StatusColors } from '../../utils/theme';

export default function DonationRequestsScreen() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadDonations(); }, [filter]);

  const loadDonations = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const { data: res } = await ngosAPI.getDashboard();
        setDonations(res.data?.requests || []);
      } else {
        const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
        const activeIds = JSON.parse(storedStr);
        
        const list = [];
        for (const id of activeIds) {
          try {
            const { data: res } = await donationsAPI.getTracking(id);
            if (res.success && res.data?.donationId) {
              const d = res.data.donationId;
              if (d.status === filter) {
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
      console.warn('Failed to load NGO donations:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, notes) => {
    try {
      await ngosAPI.updateStatus(id, status, notes);
      
      // Cache the accepted ones locally to continue tracking/updating their statuses
      if (status === 'accepted') {
        const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
        const activeIds = JSON.parse(storedStr);
        if (!activeIds.includes(id)) {
          activeIds.push(id);
          await AsyncStorage.setItem('ngo_accepted_donations', JSON.stringify(activeIds));
        }
      }

      Alert.alert('Updated! ✅', `Donation status updated to ${status}`);
      loadDonations();
    } catch (e) {
      Alert.alert('Error', 'Failed to update donation status');
    }
  };

  const handleAccept = (donation) =>
    Alert.alert('Accept Donation?', `Accept ${donation.category} (${donation.quantity}) from this donor?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept ✅', onPress: () => updateStatus(donation._id, 'accepted', 'Donation accepted by NGO') },
    ]);

  const handleReject = (donation) =>
    Alert.alert('Reject Donation?', 'This will notify the donor of rejection.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject ❌', style: 'destructive', onPress: () => updateStatus(donation._id, 'cancelled', 'Donation cancelled by NGO') },
    ]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.resourceEmoji}>{DonationTypeIcons[item.category] || '🎁'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.resourceType}>{item.category?.toUpperCase()}</Text>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (StatusColors[item.status] || Colors.primary) + '20' }]}>
          <Text style={[styles.statusText, { color: StatusColors[item.status] || Colors.primary }]}>{item.status}</Text>
        </View>
      </View>

      {item.is_emergency && (
        <View style={styles.emergencyTag}>
          <Text style={styles.emergencyTagText}>🚨 EMERGENCY DONATION</Text>
        </View>
      )}

      {item.description && <Text style={styles.description}>{item.description}</Text>}

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
            <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
            <Ionicons name="close-circle" size={18} color={Colors.error} style={{ marginRight: 4 }} />
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'accepted' && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
          <TouchableOpacity style={[styles.scheduleBtn, { flex: 1, backgroundColor: Colors.info + '15' }]} onPress={() => updateStatus(item._id, 'in_transit', 'Pickup complete, items in transit')}>
            <Text style={{ color: Colors.info, fontWeight: '700' }}>🚚 Set In Transit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scheduleBtn, { flex: 1, backgroundColor: Colors.success + '15' }]} onPress={() => updateStatus(item._id, 'delivered', 'Donation items delivered and verified')}>
            <Text style={{ color: Colors.success, fontWeight: '700' }}>📦 Set Delivered</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'in_transit' && (
        <TouchableOpacity style={[styles.scheduleBtn, { marginTop: Spacing.md, backgroundColor: Colors.success + '15' }]} onPress={() => updateStatus(item._id, 'delivered', 'Donation items delivered and verified')}>
          <Text style={{ color: Colors.success, fontWeight: '700' }}>📦 Confirm Delivery</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Donation Requests 📬</Text>
        <ScrollHorizontalFilters filter={filter} setFilter={setFilter} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDonations} tintColor={Colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No {filter} donations</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function ScrollHorizontalFilters({ filter, setFilter }) {
  const { ScrollView } = require('react-native');
  const filters = ['pending', 'accepted', 'pickup_scheduled', 'delivered', 'verified'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
      {filters.map((f) => (
        <TouchableOpacity key={f} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: filter === f ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }]} onPress={() => setFilter(f)}>
          <Text style={{ color: '#FFF', fontWeight: filter === f ? '700' : '400', fontSize: 13, textTransform: 'capitalize' }}>{f.replace('_', ' ')}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  list: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  resourceEmoji: { fontSize: 36 },
  cardInfo: { flex: 1 },
  resourceType: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  quantity: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  date: { color: Colors.textLight, fontSize: Typography.fontSize.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  emergencyTag: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: Spacing.sm },
  emergencyTagText: { color: Colors.emergency, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  description: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: BorderRadius.md, padding: Spacing.sm },
  acceptText: { color: '#FFF', fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.sm },
  rejectText: { color: Colors.error, fontWeight: '700' },
  scheduleBtn: { marginTop: Spacing.md, backgroundColor: Colors.info + '15', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  scheduleBtnText: { color: Colors.info, fontWeight: '700', fontSize: Typography.fontSize.md },
  empty: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 64 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.fontSize.lg, fontWeight: '600' },
});
