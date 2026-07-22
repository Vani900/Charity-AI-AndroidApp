/**
 * Home Screen – main dashboard for donors.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDonations } from '../redux/slices/donationSlice';
import { fetchEmergencyAlerts } from '../redux/slices/emergencySlice';
import { fetchUnreadCount } from '../redux/slices/notificationSlice';
import { fetchAnalyticsSummary } from '../redux/slices/analyticsSlice';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons, StatusColors } from '../utils/theme';
import * as Location from 'expo-location';

const DONATION_TYPES = [
  { type: 'money', label: 'Money', color: Colors.money },
  { type: 'food', label: 'Food', color: Colors.food },
  { type: 'clothes', label: 'Clothes', color: Colors.clothes },
  { type: 'books', label: 'Books', color: Colors.books },
  { type: 'medicines', label: 'Medicines', color: Colors.medicines },
  { type: 'blood', label: 'Blood', color: Colors.blood },
];

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: donations } = useSelector((s) => s.donations);
  const { hasActiveAlerts, alerts } = useSelector((s) => s.emergency);
  const { unreadCount } = useSelector((s) => s.notifications);
  const { summary } = useSelector((s) => s.analytics);

  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const alertAnim = new Animated.Value(1);

  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  // Pulse animation for emergency banner
  useEffect(() => {
    if (hasActiveAlerts) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(alertAnim, { toValue: 1.02, duration: 600, useNativeDriver: true }),
          Animated.timing(alertAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [hasActiveAlerts]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        dispatch(fetchEmergencyAlerts({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }));
      }
    } catch (e) {}
  };

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchDonations()),
      dispatch(fetchUnreadCount()),
      dispatch(fetchAnalyticsSummary()),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const recentDonations = donations.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good day, 👋</Text>
            <Text style={styles.name}>{user?.name || 'Friend'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Impact Summary */}
        <View style={styles.impactRow}>
          <View style={styles.impactCard}>
            <Text style={styles.impactNum}>{summary?.total_donations || donations.length}</Text>
            <Text style={styles.impactLabel}>Donations</Text>
          </View>
          <View style={[styles.impactCard, styles.impactCardMid]}>
            <Text style={styles.impactNum}>{summary?.people_helped || 0}</Text>
            <Text style={styles.impactLabel}>Helped</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactNum}>{summary?.verified_donations || 0}</Text>
            <Text style={styles.impactLabel}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Emergency Alert Banner */}
        {hasActiveAlerts && (
          <Animated.View style={[{ transform: [{ scale: alertAnim }] }]}>
            <TouchableOpacity
              style={styles.emergencyBanner}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Text style={styles.emergencyIcon}>🚨</Text>
              <View style={styles.emergencyText}>
                <Text style={styles.emergencyTitle}>Emergency Alerts Nearby!</Text>
                <Text style={styles.emergencySubtitle}>
                  {alerts.length} urgent request{alerts.length > 1 ? 's' : ''} within your area
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Donate Now */}
        <Text style={styles.sectionTitle}>What would you like to donate?</Text>
        <View style={styles.donateGrid}>
          {DONATION_TYPES.map((item) => (
            <TouchableOpacity
              key={item.type}
              style={styles.donateCard}
              onPress={() => navigation.navigate('Donate', { preselect: item.type })}
            >
              <View style={[styles.donateIconBg, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.donateIcon}>{DonationTypeIcons[item.type]}</Text>
              </View>
              <Text style={styles.donateLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Donations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Donations</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentDonations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyTitle}>No donations yet</Text>
            <Text style={styles.emptySubtitle}>Make your first donation and change someone's life!</Text>
          </View>
        ) : (
          recentDonations.map((d) => (
            <TouchableOpacity
              key={d._id}
              style={styles.donationItem}
              onPress={() => navigation.navigate('DonationTracking', { donationId: d._id })}
            >
              <View style={styles.donationLeft}>
                <Text style={styles.donationIcon}>{DonationTypeIcons[d.category]}</Text>
                <View>
                  <Text style={styles.donationType}>{d.category?.toUpperCase()}</Text>
                  <Text style={styles.donationQty}>{d.quantity}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: StatusColors[d.status] + '20' }]}>
                <Text style={[styles.statusText, { color: StatusColors[d.status] }]}>{d.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  greeting: { fontSize: Typography.fontSize.md, color: 'rgba(255,255,255,0.8)' },
  name: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  notifBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: Colors.emergency,
    borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  impactRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  impactCard: { flex: 1, alignItems: 'center' },
  impactCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  impactNum: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  impactLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { padding: Spacing.lg },
  emergencyBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.emergency,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  emergencyIcon: { fontSize: 32, marginRight: Spacing.md },
  emergencyText: { flex: 1 },
  emergencyTitle: { fontWeight: '800', color: '#FFF', fontSize: Typography.fontSize.md },
  emergencySubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.sm, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  seeAll: { color: Colors.primary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  donateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  donateCard: {
    width: '30%', alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadows.sm,
  },
  donateIconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  donateIcon: { fontSize: 28 },
  donateLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, textAlign: 'center' },
  donationItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadows.sm,
  },
  donationLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  donationIcon: { fontSize: 32 },
  donationType: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.sm },
  donationQty: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
});
