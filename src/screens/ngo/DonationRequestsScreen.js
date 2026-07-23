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

export default function DonationRequestsScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => { loadDonations(); }, [filter]);

  const loadDonations = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const { data: res } = await ngosAPI.getDashboard();
        setDonations(res.data?.requests || res.data?.data?.requests || []);
      } else {
        const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
        const activeIds = JSON.parse(storedStr);
        
        const list = [];
        for (const id of activeIds) {
          try {
            const { data: res } = await donationsAPI.getTracking(id);
            if (res.success && res.data?.donationId) {
              const d = res.data.donationId;
              
              if (filter === 'all') {
                list.push(d);
              } else if (filter === 'accepted' && d.status === 'accepted') {
                list.push(d);
              } else if (filter === 'pickup_scheduled' && d.status === 'pickup_scheduled') {
                list.push(d);
              } else if (filter === 'picked_up' && d.status === 'in_transit') { // picked_up aligns with transit/picked_up
                list.push(d);
              } else if (filter === 'delivered' && (d.status === 'delivered' || d.status === 'verified')) {
                list.push(d);
              } else if (filter === 'rejected' && d.status === 'cancelled') {
                list.push(d);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch cached donation ${id}:`, err.message);
          }
        }

        // For 'all' filter, also append pending matched requests from dashboard
        if (filter === 'all') {
          try {
            const { data: res } = await ngosAPI.getDashboard();
            const pendings = res.data?.requests || res.data?.data?.requests || [];
            list.unshift(...pendings);
          } catch (e) {
            console.warn('Failed to load pending requests for All filter:', e.message);
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
    setUpdatingId(id);
    try {
      await ngosAPI.updateStatus(id, status, notes);
      
      // Cache accepted or status-changed donations locally to track them correctly
      const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
      const activeIds = JSON.parse(storedStr);
      if (!activeIds.includes(id)) {
        activeIds.push(id);
        await AsyncStorage.setItem('ngo_accepted_donations', JSON.stringify(activeIds));
      }

      Alert.alert('Updated! ✅', `Donation status updated to ${status}`);
      loadDonations();
    } catch (e) {
      Alert.alert('Error', 'Failed to update donation status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = (donation) =>
    Alert.alert('Accept Donation?', `Accept ${donation.category} (${donation.quantity}) from this donor?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept ✅', onPress: () => updateStatus(donation._id, 'accepted', 'Donation accepted by NGO') },
    ]);

  const handleReject = (donation) => {
    Alert.prompt(
      'Reject Donation?',
      'Please state the reason for rejecting this donation request:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject ❌', 
          style: 'destructive', 
          onPress: (reason) => updateStatus(donation._id, 'cancelled', reason || 'Donation rejected by NGO') 
        }
      ],
      'plain-text'
    );
  };

  const handleSchedulePickup = (id) => {
    Alert.prompt(
      'Schedule Pickup 📅',
      'Enter pickup date, time, and address details:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule',
          onPress: (details) => updateStatus(id, 'pickup_scheduled', `Pickup Scheduled: ${details || 'Details provided'}`)
        }
      ],
      'plain-text'
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.resourceEmoji}>{DonationTypeIcons[item.category] || '🎁'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.resourceType}>{item.category?.toUpperCase()}</Text>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <Text style={styles.donorName}>Donor: {item.donorId?.name || 'Anonymous'}</Text>
          {item.donorId?.phone && <Text style={styles.donorPhone}>📞 {item.donorId.phone}</Text>}
          <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (StatusColors[item.status] || Colors.primary) + '20' }]}>
          <Text style={[styles.statusText, { color: StatusColors[item.status] || Colors.primary }]}>{item.status}</Text>
        </View>
      </View>

      {item.description && <Text style={styles.description}>{item.description}</Text>}

      <View style={styles.actionsRow}>
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)} disabled={updatingId === item._id}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)} disabled={updatingId === item._id}>
              <Ionicons name="close-circle" size={16} color={Colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.info }]} onPress={() => handleSchedulePickup(item._id)}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>📅 Schedule Pickup</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pickup_scheduled' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.warning }]} onPress={() => updateStatus(item._id, 'in_transit', 'Items picked up and in transit')}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>🚚 Mark as Picked Up</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_transit' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => updateStatus(item._id, 'delivered', 'Donation delivered successfully')}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>📦 Mark as Delivered</Text>
          </TouchableOpacity>
        )}

        {item.status === 'delivered' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => Alert.alert('Upload Proof', 'Proof upload is fully supported via web interface. Verification is complete.')}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>✅ Verification Complete</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'pending' && item.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate('DonationChat', { donationId: item._id })}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.chatBtnText}>Chat with Donor</Text>
          </TouchableOpacity>
        )}
      </View>
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
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDonations} tintColor={Colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No {filter} requests available</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function ScrollHorizontalFilters({ filter, setFilter }) {
  const { ScrollView } = require('react-native');
  const filters = ['all', 'pending', 'accepted', 'pickup_scheduled', 'picked_up', 'delivered', 'rejected'];
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
  donorName: { fontSize: Typography.fontSize.sm, color: Colors.text, marginTop: 2, fontWeight: '600' },
  donorPhone: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  date: { color: Colors.textLight, fontSize: Typography.fontSize.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  description: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.md, flex: 1 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: BorderRadius.md, padding: Spacing.sm },
  acceptText: { color: '#FFF', fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.md, padding: Spacing.sm },
  rejectText: { color: Colors.error, fontWeight: '700' },
  actionBtn: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: Spacing.sm },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  chatBtnText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  empty: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 64 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.fontSize.lg, fontWeight: '600' },
});
