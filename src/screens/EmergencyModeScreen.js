/**
 * Emergency Mode Screen – real-time nearby alerts, one-tap donate.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmergencyAlerts } from '../redux/slices/emergencySlice';
import { emergencyAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';
import * as Location from 'expo-location';

const URGENCY_COLORS = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: Colors.primary,
};

export default function EmergencyModeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { alerts, types, isLoading } = useSelector((s) => s.emergency);
  const [location, setLocation] = useState(null);
  const [donating, setDonating] = useState(null);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    startPulse();
    getLocationAndAlerts();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const getLocationAndAlerts = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        dispatch(fetchEmergencyAlerts({ lat: loc.coords.latitude, lng: loc.coords.longitude }));
      }
    } catch (e) {}
  };

  const handleOneTapDonate = async (alert) => {
    if (!location) {
      Alert.alert('Location required', 'Enable location to donate');
      return;
    }
    Alert.alert(
      `Donate ${alert.resource_needed}? 🚨`,
      `To ${alert.ngo_name}\n${alert.distance_km} km away\n\nThis will create an emergency donation request immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Donate Now 🚨',
          style: 'destructive',
          onPress: async () => {
            setDonating(alert.ngo_id);
            try {
              const { data } = await emergencyAPI.oneTapDonate(
                alert.ngo_id, alert.resource_needed,
                location.latitude, location.longitude
              );
              Alert.alert('Emergency Donation Created! 🚨', data.message);
            } catch (e) {
              Alert.alert('Error', 'Failed to create donation');
            } finally {
              setDonating(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={getLocationAndAlerts} tintColor={Colors.emergency} />}
    >
      {/* Header */}
      <LinearGradient colors={['#7F1D1D', '#DC2626']} style={styles.header}>
        <Animated.Text style={[styles.headerIcon, { transform: [{ scale: pulseAnim }] }]}>🚨</Animated.Text>
        <Text style={styles.headerTitle}>Emergency Mode</Text>
        <Text style={styles.headerSub}>
          {alerts.length > 0
            ? `${alerts.length} emergency alert${alerts.length > 1 ? 's' : ''} near you`
            : 'No active emergencies nearby'
          }
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Emergency Types Legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
          {types.map((t) => (
            <View key={t.type} style={styles.typeChip}>
              <Text style={styles.typeChipIcon}>{t.icon}</Text>
              <Text style={styles.typeChipLabel}>{t.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Alert Cards */}
        {isLoading && alerts.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.emergency} />
            <Text style={styles.loadingText}>Scanning for nearby emergencies...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>No emergency requests near you right now.</Text>
            <Text style={styles.emptySubtitle}>You'll be notified if something urgent comes up.</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.request_id} style={styles.alertCard}>
              {/* Urgency badge */}
              <View style={[styles.urgencyBar, { backgroundColor: URGENCY_COLORS[alert.urgency] }]}>
                <Text style={styles.urgencyText}>
                  {alert.urgency.toUpperCase()} PRIORITY
                </Text>
              </View>

              <View style={styles.alertBody}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertNGO}>{alert.ngo_name}</Text>
                  <View style={styles.distanceBadge}>
                    <Ionicons name="location" size={12} color={Colors.primary} />
                    <Text style={styles.distanceText}>{alert.distance_km} km</Text>
                  </View>
                </View>

                <View style={styles.alertResource}>
                  <Text style={styles.alertResourceLabel}>Needs:</Text>
                  <Text style={styles.alertResourceValue}>{alert.resource_needed.toUpperCase()} – {alert.quantity}</Text>
                </View>

                {alert.ngo_address && (
                  <Text style={styles.alertAddress} numberOfLines={1}>📍 {alert.ngo_address}</Text>
                )}

                <TouchableOpacity
                  style={styles.donateBtn}
                  onPress={() => handleOneTapDonate(alert)}
                  disabled={donating === alert.ngo_id}
                >
                  <LinearGradient colors={['#DC2626', '#EF4444']} style={styles.donateBtnGradient}>
                    {donating === alert.ngo_id
                      ? <ActivityIndicator color="#FFF" />
                      : <>
                        <Text style={styles.donateBtnText}>⚡ One-Tap Donate</Text>
                      </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  headerIcon: { fontSize: 60, marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.md, marginTop: 4, textAlign: 'center' },
  content: { padding: Spacing.lg },
  typesScroll: { marginBottom: Spacing.lg },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginRight: Spacing.sm, ...Shadows.sm,
  },
  typeChipIcon: { fontSize: 20 },
  typeChipLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text },
  loadingBox: { alignItems: 'center', padding: Spacing['2xl'] },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md },
  emptyState: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 80, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, fontSize: Typography.fontSize.md },
  alertCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    overflow: 'hidden', marginBottom: Spacing.lg, ...Shadows.md,
  },
  urgencyBar: { paddingHorizontal: Spacing.md, paddingVertical: 6 },
  urgencyText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.xs, letterSpacing: 1 },
  alertBody: { padding: Spacing.md },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  alertNGO: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: Colors.text, flex: 1 },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  distanceText: { fontSize: Typography.fontSize.sm, color: Colors.primary, fontWeight: '700' },
  alertResource: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  alertResourceLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.md },
  alertResourceValue: { fontWeight: '700', color: Colors.emergency, fontSize: Typography.fontSize.md },
  alertAddress: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  donateBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  donateBtnGradient: { padding: Spacing.md, alignItems: 'center' },
  donateBtnText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.md },
});
