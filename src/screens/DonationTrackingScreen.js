/**
 * Donation Tracking Screen – real-time WebSocket updates.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { donationsAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, StatusColors, DonationTypeIcons } from '../utils/theme';

const STATUS_FLOW = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'accepted', label: 'Accepted', icon: '✅' },
  { key: 'in_transit', label: 'In Transit', icon: '🚚' },
  { key: 'delivered', label: 'Delivered & Verified ⛓️', icon: '📦' },
];

export default function DonationTrackingScreen({ route, navigation }) {
  const donationId = route?.params?.donationId;
  const [donation, setDonation] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadDonation();
    
    // Set up robust HTTP short-polling (every 5 seconds)
    const interval = setInterval(loadDonation, 5000);
    setConnected(true);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [donationId]);

  const loadDonation = async () => {
    try {
      const { data: res } = await donationsAPI.getTracking(donationId);
      if (res.success && res.data) {
        setDonation(res.data.donationId);
        setTracking(res.data.timeline || []);
      }
    } catch (e) {
      console.warn('Failed to load tracking updates:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIdx = STATUS_FLOW.findIndex((s) => s.key === donation?.status);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tracking info...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation Tracking</Text>
        <View style={styles.wsIndicator}>
          <View style={[styles.wsDot, { backgroundColor: connected ? Colors.success : Colors.error }]} />
          <Text style={styles.wsText}>{connected ? 'Live' : 'Offline'}</Text>
        </View>

        {donation && (
          <View style={styles.donationSummary}>
            <Text style={styles.donationEmoji}>{DonationTypeIcons[donation.category]}</Text>
            <View>
              <Text style={styles.donationType}>{donation.category?.toUpperCase()}</Text>
              <Text style={styles.donationQty}>{donation.quantity}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: StatusColors[donation.status] + '30' }]}>
              <Text style={[styles.statusText, { color: StatusColors[donation.status] }]}>{donation.status?.replace('_', ' ')}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {/* Progress Timeline */}
        <Text style={styles.sectionTitle}>Delivery Progress</Text>
        <View style={styles.timeline}>
          {STATUS_FLOW.map((step, idx) => {
            const isDone = idx <= currentStatusIdx;
            const isCurrent = idx === currentStatusIdx;
            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineCircle,
                    isDone && styles.timelineCircleDone,
                    isCurrent && styles.timelineCircleCurrent,
                  ]}>
                    {isDone
                      ? <Ionicons name="checkmark" size={14} color="#FFF" />
                      : <Text style={styles.timelineIdx}>{idx + 1}</Text>
                    }
                  </View>
                  {idx < STATUS_FLOW.length - 1 && (
                    <View style={[styles.timelineLine, idx < currentStatusIdx && styles.timelineLineDone]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, isCurrent && styles.timelineLabelCurrent]}>
                    {step.icon} {step.label}
                  </Text>
                  {isCurrent && <Text style={styles.timelineCurrent}>Current status</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Tracking Notes */}
        {tracking.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Activity Log</Text>
            {[...tracking].reverse().map((note, idx) => (
              <View key={idx} style={styles.noteCard}>
                <View style={styles.noteDot} />
                <View style={styles.noteContent}>
                  <Text style={styles.noteStatus}>{note.status?.replace('_', ' ') || 'Update'}</Text>
                  <Text style={styles.noteText}>{note.note}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Blockchain Record */}
        {donation?.blockchainTxHash && (
          <View style={styles.blockchainCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <View style={styles.blockchainContent}>
              <Text style={styles.blockchainTitle}>Blockchain Verified ⛓️</Text>
              <Text style={styles.blockchainHash} numberOfLines={1}>{donation.blockchainTxHash}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  back: { marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF', marginBottom: Spacing.sm },
  wsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  wsDot: { width: 8, height: 8, borderRadius: 4 },
  wsText: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.sm },
  donationSummary: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  donationEmoji: { fontSize: 36 },
  donationType: { fontWeight: '700', color: '#FFF', fontSize: Typography.fontSize.md },
  donationQty: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.sm },
  statusBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontWeight: '700', fontSize: Typography.fontSize.sm },
  content: { padding: Spacing.lg },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.lg },
  timeline: { paddingLeft: Spacing.sm },
  timelineStep: { flexDirection: 'row', gap: Spacing.md, minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineCircleDone: { backgroundColor: Colors.primary },
  timelineCircleCurrent: { backgroundColor: Colors.primaryLight, ...Shadows.sm },
  timelineIdx: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: Colors.primary },
  timelineContent: { flex: 1, paddingBottom: Spacing.lg },
  timelineLabel: { fontSize: Typography.fontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  timelineLabelCurrent: { color: Colors.primary, fontWeight: '800' },
  timelineCurrent: { fontSize: Typography.fontSize.xs, color: Colors.primary, marginTop: 2 },
  noteCard: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  noteDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  noteContent: { flex: 1 },
  noteStatus: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.sm, textTransform: 'capitalize' },
  noteText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  blockchainCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30', marginTop: Spacing.md,
  },
  blockchainContent: { flex: 1 },
  blockchainTitle: { fontWeight: '700', color: Colors.primary, fontSize: Typography.fontSize.md },
  blockchainHash: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontFamily: 'monospace', marginTop: 2 },
});
