/**
 * Requirement Management Screen – NGO posts resource needs.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ngosAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons } from '../../utils/theme';

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];
const RESOURCE_TYPES = ['money', 'food', 'clothes', 'books'];
const URGENCY_COLORS = { low: Colors.success, medium: Colors.warning, high: Colors.accentOrange, critical: Colors.emergency };

export default function RequirementManagementScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: 'food', urgency: 'medium', quantity: '', description: '', needByDate: '' });
  const [filter, setFilter] = useState('all');

  // Edit Form States
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ category: 'food', urgency: 'medium', quantity: '', description: '', needByDate: '' });

  useEffect(() => { loadRequests(); }, []);

  useEffect(() => {
    applyFilter();
  }, [requests, filter]);

  const loadRequests = async () => {
    setLoading(true);
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

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRequests(requests);
    } else if (filter === 'active') {
      setFilteredRequests(requests.filter(r => r.status === 'open' || !r.status));
    } else {
      setFilteredRequests(requests.filter(r => r.status === filter));
    }
  };

  const submitRequest = async () => {
    if (!form.quantity) { Alert.alert('Error', 'Please enter quantity'); return; }
    if (!form.description || form.description.length < 5) { Alert.alert('Error', 'Please enter a description (min 5 characters)'); return; }
    setSubmitting(true);
    try {
      const payload = {
        category: form.category,
        urgency: form.urgency,
        quantity: form.quantity,
        description: form.description,
      };
      if (form.needByDate && form.needByDate.trim() !== '') {
        payload.needByDate = form.needByDate.trim();
      }
      await ngosAPI.createRequirement(payload);
      Alert.alert(
        'Request Posted! ✅',
        'Donors will be matched to your requirement.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForm(false);
              setForm({ category: 'food', urgency: 'medium', quantity: '', description: '', needByDate: '' });
              loadRequests();
              if (navigation) {
                navigation.navigate('Dashboard');
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post requirement');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (r) => {
    setEditingId(r._id);
    setEditForm({
      category: r.category || 'food',
      urgency: r.urgency || 'medium',
      quantity: r.quantity || '',
      description: r.description || '',
      needByDate: r.needByDate ? new Date(r.needByDate).toISOString().split('T')[0] : '',
    });
  };

  const submitEdit = () => {
    // Simulated updates as backend PUT requirement endpoint is not in schema
    const updated = requests.map(r => {
      if (r._id === editingId) {
        return { ...r, ...editForm };
      }
      return r;
    });
    setRequests(updated);
    setEditingId(null);
    Alert.alert(
      'Updated! ✅',
      'Local state requirement updated. (Note: PUT requirements endpoint is not supported on the backend API)'
    );
  };

  const handlePause = (id) => {
    const updated = requests.map(r => {
      if (r._id === id) {
        return { ...r, status: r.status === 'closed' ? 'open' : 'closed' };
      }
      return r;
    });
    setRequests(updated);
    Alert.alert(
      'Status Changed ⚙️',
      'Local status toggled between open/closed. (Note: PATCH requirements endpoint is not supported on the backend API)'
    );
  };

  const handleClose = (id) => {
    const updated = requests.map(r => {
      if (r._id === id) {
        return { ...r, status: 'closed' };
      }
      return r;
    });
    setRequests(updated);
    Alert.alert(
      'Status Closed 🛑',
      'Local status set to Closed. (Note: PATCH requirements endpoint is not supported on the backend API)'
    );
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Requirement?', 'Are you sure you want to delete this requirement?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: () => {
          const updated = requests.filter(r => r._id !== id);
          setRequests(updated);
          Alert.alert('Deleted ✅', 'Requirement removed from local list. (Note: DELETE requirements endpoint is not supported on the backend API)');
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Requirements 📋</Text>
        <Text style={styles.headerSub}>Manage what your NGO needs most</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setShowForm(!showForm); setEditingId(null); }}>
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

            <Text style={styles.label}>Description *</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Describe details..." placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />

            <Text style={styles.label}>Required Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.needByDate} onChangeText={(v) => setForm({ ...form, needByDate: v })} placeholder="e.g. 2026-08-30" placeholderTextColor={Colors.textLight} />

            <TouchableOpacity style={styles.submitBtn} onPress={submitRequest} disabled={submitting}>
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.submitGradient}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Post Requirement</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Filters */}
        <View style={styles.filterRow}>
          {['all', 'active', 'fulfilled', 'closed'].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterChipText, filter === f && { color: '#FFF' }]}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of Requirements */}
        <Text style={styles.sectionTitle}>List of Requirements ({filteredRequests.length})</Text>
        {loading ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.xl }} /> :
          filteredRequests.map((r) => (
            <View key={r._id} style={styles.requestCard}>
              {editingId === r._id ? (
                // Edit form for this specific card
                <View style={{ gap: Spacing.sm }}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput style={styles.input} value={editForm.quantity} onChangeText={(v) => setEditForm({ ...editForm, quantity: v })} />
                  <Text style={styles.label}>Description</Text>
                  <TextInput style={[styles.input, styles.textarea]} value={editForm.description} onChangeText={(v) => setEditForm({ ...editForm, description: v })} multiline />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity style={[styles.cardBtn, { backgroundColor: Colors.success }]} onPress={submitEdit}>
                      <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cardBtn, { backgroundColor: Colors.border }]} onPress={() => setEditingId(null)}>
                      <Text style={{ color: Colors.text }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Standard details view
                <>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestIcon}>{DonationTypeIcons[r.category] || '🎁'}</Text>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestResource}>{r.category?.toUpperCase()}</Text>
                      <Text style={styles.requestQty}>Target Needed: {r.quantity}</Text>
                      <Text style={styles.receivedQty}>Fulfillment Progress: 0 received</Text>
                    </View>
                    <View style={[styles.urgencyBadge, { backgroundColor: (URGENCY_COLORS[r.urgency] || Colors.primary) + '20' }]}>
                      <Text style={[styles.urgencyBadgeText, { color: URGENCY_COLORS[r.urgency] || Colors.primary }]}>{r.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.descriptionText}>{r.description}</Text>
                  
                  {r.needByDate && (
                    <Text style={styles.dateText}>📅 Required Date: {new Date(r.needByDate).toLocaleDateString()}</Text>
                  )}
                  
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadgeInline, { backgroundColor: r.status === 'closed' ? '#EF444420' : '#10B98120' }]}>
                      <Text style={[styles.statusBadgeTextInline, { color: r.status === 'closed' ? '#EF4444' : '#10B981' }]}>
                        {r.status || 'active'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.cardBtn} onPress={() => Alert.alert('Requirement Details', `Category: ${r.category}\nTarget: ${r.quantity}\nUrgency: ${r.urgency}\nStatus: ${r.status || 'active'}\nDescription: ${r.description}`)}>
                      <Text style={styles.cardBtnText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardBtn} onPress={() => handleEdit(r)}>
                      <Text style={styles.cardBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardBtn} onPress={() => handlePause(r._id)}>
                      <Text style={styles.cardBtnText}>{r.status === 'closed' ? 'Activate' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardBtn} onPress={() => handleClose(r._id)}>
                      <Text style={styles.cardBtnText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cardBtn, { borderColor: Colors.error }]} onPress={() => handleDelete(r._id)}>
                      <Text style={[styles.cardBtnText, { color: Colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  submitBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  submitGradient: { padding: Spacing.md, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  requestCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  requestIcon: { fontSize: 32 },
  requestInfo: { flex: 1 },
  requestResource: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  requestQty: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  receivedQty: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginTop: 1 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  descriptionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing.sm, lineHeight: 18 },
  dateText: { fontSize: Typography.fontSize.xs, color: Colors.textLight, marginTop: Spacing.xs },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
  statusBadgeInline: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusBadgeTextInline: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  cardBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 4, minWidth: 50, alignItems: 'center' },
  cardBtnText: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
});
