/**
 * Fraud Detection Dashboard – Admin.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

export default function FraudDetectionScreen() {
  const [fraudData, setFraudData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFraudData(); }, []);

  const loadFraudData = async () => {
    setLoading(true);
    try {
      const { data: res } = await adminAPI.getFraudDetection();
      if (res.success) {
        setFraudData(res.data);
      }
    } catch (e) {
      console.warn('Failed to load fraud data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const suspiciousDonors = fraudData?.suspiciousDonors || [];
  const unprovenDeliveries = fraudData?.deliveredWithoutProofCount || 0;

  const riskLevel = suspiciousDonors.length > 5 || unprovenDeliveries > 20 ? 'HIGH' :
                    suspiciousDonors.length > 2 || unprovenDeliveries > 10 ? 'MEDIUM' : 'LOW';
  const riskColor = { HIGH: Colors.error, MEDIUM: Colors.warning, LOW: Colors.success };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#450A0A', '#7F1D1D']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Fraud Detection 🛡️</Text>
          <TouchableOpacity onPress={loadFraudData} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>AI-powered suspicious activity monitoring</Text>

        <View style={[styles.riskBanner, { backgroundColor: riskColor[riskLevel] + '30', borderColor: riskColor[riskLevel] }]}>
          <Ionicons name="shield" size={24} color={riskColor[riskLevel]} />
          <View>
            <Text style={[styles.riskLevel, { color: riskColor[riskLevel] }]}>Platform Risk: {riskLevel}</Text>
            <Text style={styles.riskSub}>Based on current activity patterns</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.error} style={{ padding: Spacing['2xl'] }} />
        ) : (
          <>
            {/* Alert Cards */}
            <View style={styles.alertGrid}>
              <View style={[styles.alertCard, suspiciousDonors.length > 0 && styles.alertCardActive]}>
                <Ionicons name="warning" size={28} color={suspiciousDonors.length > 0 ? Colors.error : Colors.success} />
                <Text style={[styles.alertNum, { color: suspiciousDonors.length > 0 ? Colors.error : Colors.success }]}>
                  {suspiciousDonors.length}
                </Text>
                <Text style={styles.alertLabel}>High-Volume Donors{'\n'}(Last 24h)</Text>
              </View>
              <View style={[styles.alertCard, unprovenDeliveries > 0 && styles.alertCardActive]}>
                <Ionicons name="camera-outline" size={28} color={unprovenDeliveries > 0 ? Colors.warning : Colors.success} />
                <Text style={[styles.alertNum, { color: unprovenDeliveries > 0 ? Colors.warning : Colors.success }]}>
                  {unprovenDeliveries}
                </Text>
                <Text style={styles.alertLabel}>Delivered Without{'\n'}Proof (&gt;7 days)</Text>
              </View>
            </View>

            {/* Suspicious Donors List */}
            {suspiciousDonors.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                  <Text style={styles.sectionTitle}>Suspicious Activity Detected</Text>
                </View>
                <Text style={styles.sectionSub}>Users with &gt;10 donations in the last 24 hours:</Text>
                {suspiciousDonors.map((d, i) => (
                  <View key={i} style={styles.suspiciousCard}>
                    <View style={styles.suspiciousIcon}>
                      <Ionicons name="person" size={20} color="#FFF" />
                    </View>
                    <View style={styles.suspiciousInfo}>
                      <Text style={styles.suspiciousId}>Donor: {d.user?.name || d.user?.email || 'Unknown Donor'}</Text>
                      <Text style={styles.suspiciousCount}>{d.count} donations in 24h</Text>
                    </View>
                    <View style={styles.flagBadge}>
                      <Text style={styles.flagText}>🚩 FLAGGED</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Clean Status */}
            {suspiciousDonors.length === 0 && unprovenDeliveries === 0 && (
              <View style={styles.cleanStatus}>
                <Ionicons name="shield-checkmark" size={64} color={Colors.success} />
                <Text style={styles.cleanTitle}>Platform Looks Clean! ✅</Text>
                <Text style={styles.cleanSubtitle}>No suspicious activity detected in the current monitoring window.</Text>
              </View>
            )}

            {/* Monitoring Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Detection Rules</Text>
              {[
                { rule: 'High-Volume Donor Alert', desc: 'Flags users with >10 donations in 24h', icon: '📊' },
                { rule: 'Unproven Delivery Alert', desc: 'Flags delivered donations without proof after 7 days', icon: '📸' },
                { rule: 'Blockchain Verification', desc: 'All donations cross-checked against blockchain records', icon: '⛓️' },
              ].map((r, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleIcon}>{r.icon}</Text>
                  <View>
                    <Text style={styles.ruleName}>{r.rule}</Text>
                    <Text style={styles.ruleDesc}>{r.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  refreshBtn: { padding: 4 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1 },
  riskLevel: { fontWeight: '800', fontSize: Typography.fontSize.md },
  riskSub: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm },
  content: { padding: Spacing.lg },
  alertGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  alertCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', gap: 6, ...Shadows.sm },
  alertCardActive: { borderWidth: 1, borderColor: Colors.error + '40' },
  alertNum: { fontSize: Typography.fontSize['3xl'], fontWeight: '800' },
  alertLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text },
  sectionSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  suspiciousCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FEF2F2', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  suspiciousIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  suspiciousInfo: { flex: 1 },
  suspiciousId: { fontWeight: '700', color: Colors.text },
  suspiciousCount: { color: Colors.error, fontSize: Typography.fontSize.sm, fontWeight: '600', marginTop: 2 },
  flagBadge: { backgroundColor: Colors.error + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  flagText: { fontSize: 10, color: Colors.error, fontWeight: '700' },
  cleanStatus: { alignItems: 'center', padding: Spacing['2xl'], backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, marginBottom: Spacing.lg, ...Shadows.sm },
  cleanTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.success, marginTop: Spacing.md },
  cleanSubtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
  ruleRow: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  ruleIcon: { fontSize: 24, width: 32 },
  ruleName: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  ruleDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
});
