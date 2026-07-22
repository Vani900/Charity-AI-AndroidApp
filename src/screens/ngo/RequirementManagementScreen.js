/**
 * Requirement Management Screen – NGO posts resource needs.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ngosAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons } from '../../utils/theme';

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];
const RESOURCE_TYPES = ['money', 'food', 'clothes', 'books', 'medicines', 'blood'];
const URGENCY_COLORS = { low: Colors.success, medium: Colors.warning, high: Colors.accentOrange, critical: Colors.emergency };

export default function RequirementManagementScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: 'food', urgency: 'medium', quantity: '', description: '', isEmergency: false });

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const { data: res } = await ngosAPI.getRequirements();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load requirements:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!form.quantity) { Alert.alert('Error', 'Please enter quantity'); return; }
    setSubmitting(true);
    try {
      await ngosAPI.createRequirement(form);
      Alert.alert('Request Posted! ✅', 'Donors will be matched to your requirement.');
      setShowForm(false);
      setForm({ category: 'food', urgency: 'medium', quantity: '', description: '', isEmergency: false });
      loadRequests();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post requirement');
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Requirements 📋</Text>
        <Text style={styles.headerSub}>Post what your NGO needs</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#FFF" />
          <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'Post New Requirement'}</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Requirement</Text>

            <Text style={styles.label}>Resource Type</Text>
            <View style={styles.typeGrid}>
              {RESOURCE_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.category === t && styles.typeChipActive]} onPress={() => setForm({ ...form, category: t })}>
                  <Text style={styles.typeEmoji}>{DonationTypeIcons[t]}</Text>
                  <Text style={[styles.typeLabel, form.category === t && { color: Colors.primary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Urgency Level</Text>
            <View style={styles.urgencyRow}>
              {URGENCY_LEVELS.map((u) => (
                <TouchableOpacity key={u} style={[styles.urgencyChip, form.urgency === u && { backgroundColor: URGENCY_COLORS[u], borderColor: URGENCY_COLORS[u] }]} onPress={() => setForm({ ...form, urgency: u })}>
                  <Text style={[styles.urgencyText, form.urgency === u && { color: '#FFF' }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity Needed *</Text>
            <TextInput style={styles.input} value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} placeholder="e.g. 50 kg, 100 units..." placeholderTextColor={Colors.textLight} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Additional details..." placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />

            <TouchableOpacity style={[styles.emergencyToggle, form.isEmergency && styles.emergencyActive]} onPress={() => setForm({ ...form, isEmergency: !form.isEmergency })}>
              <Text>🚨 Mark as Emergency</Text>
              <View style={[styles.toggle, form.isEmergency && { backgroundColor: Colors.emergency }]}>
                <View style={[styles.toggleDot, form.isEmergency && { transform: [{ translateX: 20 }] }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={submitRequest} disabled={submitting}>
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.submitGradient}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Post Requirement</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Existing Requests */}
        <Text style={styles.sectionTitle}>Active Requirements ({requests.length})</Text>
        {loading ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.xl }} /> :
          requests.map((r) => (
            <View key={r._id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestIcon}>{DonationTypeIcons[r.category] || '🎁'}</Text>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestResource}>{r.category?.toUpperCase()}</Text>
                  <Text style={styles.requestQty}>{r.quantity}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLORS[r.urgency] + '20' }]}>
                  <Text style={[styles.urgencyBadgeText, { color: URGENCY_COLORS[r.urgency] }]}>{r.urgency}</Text>
                </View>
              </View>
              {r.isEmergency && <View style={styles.emergencyTag}><Text style={styles.emergencyTagText}>🚨 EMERGENCY</Text></View>}
              {r.isFulfilled && <View style={styles.fulfilledTag}><Text style={styles.fulfilledTagText}>✅ FULFILLED</Text></View>}
            </View>
          ))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { padding: Spacing.lg },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  form: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.md },
  formTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: Spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: Typography.fontSize.sm, color: Colors.text, fontWeight: '600', textTransform: 'capitalize' },
  urgencyRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  urgencyChip: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  urgencyText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSize.base, color: Colors.text, backgroundColor: Colors.background, marginBottom: Spacing.sm },
  textarea: { height: 80, textAlignVertical: 'top' },
  emergencyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.md },
  emergencyActive: { borderColor: Colors.emergency, backgroundColor: '#FFF5F5' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.border, padding: 3 },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  submitBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  submitGradient: { padding: Spacing.md, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  requestCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  requestIcon: { fontSize: 32 },
  requestInfo: { flex: 1 },
  requestResource: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  requestQty: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  emergencyTag: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: Spacing.sm },
  emergencyTagText: { color: Colors.emergency, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  fulfilledTag: { backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: Spacing.sm },
  fulfilledTagText: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '700' },
});
