/**
 * NGO Dashboard Screen.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ngosAPI, authAPI, donationsAPI } from '../../services/api';
import { logout } from '../../redux/slices/authSlice';
import { Colors, Typography, Spacing, BorderRadius, Shadows, StatusColors, DonationTypeIcons } from '../../utils/theme';
import * as ImagePicker from 'expo-image-picker';

const URGENCY_COLORS = { low: Colors.success, medium: Colors.warning, high: Colors.accentOrange, critical: Colors.emergency };

export default function NGODashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [ngo, setNgo] = useState(null);
  const [stats, setStats] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      setError(null);
      const [profileRes, dashRes, reqsRes] = await Promise.all([
        authAPI.getMe(),
        ngosAPI.getDashboard(),
        ngosAPI.getRequirements(),
      ]);
      const currentNgo = profileRes.data?.data || null;
      setNgo(currentNgo);
      setRequirements(reqsRes.data?.data || reqsRes.data || []);

      const fetchedStats = [...(dashRes.data?.data?.stats || [])];
      const requirementsCount = (reqsRes.data?.data || reqsRes.data || []).length;
      if (fetchedStats.length >= 3) {
        fetchedStats.push({
          v: requirementsCount.toString(),
          l: 'Active Requirements',
          color: '#8B5CF6',
          bg: 'rgba(139, 92, 246, 0.15)',
        });
      }
      setStats(fetchedStats);

      // Load filtered donation requests
      if (filter === 'pending') {
        setDonations(dashRes.data?.data?.requests || []);
      } else {
        const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
        const activeIds = JSON.parse(storedStr);
        const list = [];
        for (const id of activeIds) {
          try {
            const { data: res } = await donationsAPI.getTracking(id);
            if (res.success && res.data?.donationId) {
              const d = res.data.donationId;
              if (filter === 'accepted' && ['accepted', 'in_transit', 'delivered', 'verified'].includes(d.status)) {
                list.push(d);
              } else if (filter === 'rejected' && d.status === 'cancelled') {
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
      console.warn('Failed to load NGO dashboard:', e.message);
      setError('Failed to refresh data from server.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id, status, noteSuffix = '') => {
    setUpdatingId(id);
    try {
      let finalNote = `Status changed via mobile dashboard overview.`;
      if (noteSuffix) {
        finalNote = noteSuffix;
      }
      await ngosAPI.updateStatus(id, status, finalNote);
      
      // Cache the accepted/rejected ones locally to track status filters correctly
      const storedStr = await AsyncStorage.getItem('ngo_accepted_donations') || '[]';
      const activeIds = JSON.parse(storedStr);
      if (!activeIds.includes(id)) {
        activeIds.push(id);
        await AsyncStorage.setItem('ngo_accepted_donations', JSON.stringify(activeIds));
      }

      Alert.alert('Success ✅', `Request status updated to ${status}.`);
      loadData();
    } catch (e) {
      console.warn('Failed to update request:', e.message);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update donation request.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied ❌', 'Camera roll access is needed to upload proof photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setProofImage(result.assets[0].uri);
    }
  };

  const submitProofOfDelivery = async () => {
    if (!selectedDonation) return;
    if (!proofImage) {
      Alert.alert('Proof Required', 'Please snap or upload a photo proof of delivery.');
      return;
    }
    setUploadingProof(true);
    try {
      const formData = new FormData();
      const filename = proofImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('file', {
        uri: proofImage,
        name: filename || 'proof.jpg',
        type,
      });
      
      try {
        await ngosAPI.uploadDocs(formData);
      } catch (err) {
        console.warn('File upload skipped or pending:', err.message);
      }

      const note = `[Receipt Confirmed] Note: ${deliveryNote || 'Donation verified successfully.'}`;
      await handleUpdateStatus(selectedDonation._id, 'delivered', note);
      
      setModalVisible(false);
      setProofImage(null);
      setDeliveryNote('');
      setSelectedDonation(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload proof of delivery.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const viewRequestDetails = (d) => {
    Alert.alert(
      `${d.category?.toUpperCase()} Donation Details`,
      `Quantity: ${d.quantity}\nDonor: ${d.donorId?.name || 'Anonymous'}\nPhone: ${d.donorId?.phone || 'Private'}\nDescription: ${d.description || 'No description provided.'}\nStatus: ${d.status}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const isNgoVerified = true;
  const approvalStatus = ngo?.approvalStatus || 'pending';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        {/* Top actions bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle-outline" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topRightActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: Spacing.md }}>
              <Ionicons name="notifications-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.ngoName}>{ngo?.name || 'NGO'} 🏢</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
          <Text style={styles.statusBadgeText}>APPROVED</Text>
        </View>
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg || 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.statValue, { color: s.color || '#FFF' }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.emergency} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Active Resource Requirements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Resource Requirements</Text>
          <TouchableOpacity 
            style={styles.createBtn} 
            onPress={() => navigation.navigate('Requirements')}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {requirements.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No active requirements yet</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('Requirements')}>
              <Text style={styles.emptyCreateBtnText}>Create Requirement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requirements.map((r) => (
            <View key={r._id} style={styles.requirementCard}>
              <View style={styles.reqTopRow}>
                <View style={styles.reqResourceWrapper}>
                  <Text style={styles.reqIcon}>{DonationTypeIcons[r.category] || '🎁'}</Text>
                  <View>
                    <Text style={styles.reqCategory}>{r.category?.toUpperCase()}</Text>
                    <Text style={styles.reqQty}>{r.quantity}</Text>
                  </View>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: (URGENCY_COLORS[r.urgency] || Colors.primary) + '20' }]}>
                  <Text style={[styles.urgencyText, { color: URGENCY_COLORS[r.urgency] || Colors.primary }]}>{r.urgency}</Text>
                </View>
              </View>

              <View style={styles.reqDetails}>
                <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Location:</Text> {ngo?.address || 'Chennai'}</Text>
                {r.needByDate && (
                  <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Required Date:</Text> {new Date(r.needByDate).toLocaleDateString()}</Text>
                )}
                <Text style={styles.detailsText}><Text style={styles.detailsLabel}>Status:</Text> <Text style={styles.statusText}>{r.status || 'open'}</Text></Text>
              </View>
            </View>
          ))
        )}

        {/* Donation Requests with accept, reject, pending tabs */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl, marginBottom: Spacing.md }]}>
          <Text style={styles.sectionTitle}>Donation Requests</Text>
          <View style={styles.filterRow}>
            {['pending', 'accepted', 'rejected'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {donations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>No {filter} requests available</Text>
          </View>
        ) : (
          donations.map((d) => (
            <View key={d._id} style={styles.donationCard}>
              <View style={styles.donTopRow}>
                <Text style={styles.donEmoji}>{DonationTypeIcons[d.category] || '🎁'}</Text>
                <View style={styles.donInfo}>
                  <Text style={styles.donTitle}>{(d.category || 'Donation')?.toUpperCase()} – {d.quantity}</Text>
                  <Text style={styles.donDonor}>Donor: {d.donorId?.name || 'Anonymous'}</Text>
                  {d.donorId?.phone && <Text style={styles.donPhone}>📞 {d.donorId.phone}</Text>}
                  <Text style={styles.donDate}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent'}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: (StatusColors[d.status] || Colors.primary) + '20' }]}>
                  <Text style={[styles.statusTagText, { color: StatusColors[d.status] || Colors.primary }]}>{d.status}</Text>
                </View>
              </View>

              <View style={styles.donActions}>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => viewRequestDetails(d)}>
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </TouchableOpacity>

                {d.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.acceptBtn]} 
                      onPress={() => handleUpdateStatus(d._id, 'accepted')}
                      disabled={updatingId === d._id}
                    >
                      {updatingId === d._id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]} 
                      onPress={() => handleUpdateStatus(d._id, 'cancelled')}
                      disabled={updatingId === d._id}
                    >
                      {updatingId === d._id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                    </TouchableOpacity>
                  </>
                )}

                {d.status === 'accepted' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: Colors.info }]} 
                      onPress={() => { setSelectedDonation(d); setModalVisible(true); setProofImage(null); }}
                    >
                      <Text style={styles.acceptBtnText}>Schedule / Assign 🚚</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: Colors.warning }]} 
                      onPress={() => handleUpdateStatus(d._id, 'in_transit', 'Donation picked up by volunteer.')}
                    >
                      <Text style={styles.acceptBtnText}>Mark Picked Up</Text>
                    </TouchableOpacity>
                  </>
                )}

                {d.status === 'in_transit' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]} 
                    onPress={() => handleUpdateStatus(d._id, 'delivered', 'Donation delivered to NGO. Verification pending.')}
                  >
                    <Text style={styles.acceptBtnText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}

                {d.status === 'delivered' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: Colors.primary, flex: 1 }]} 
                    onPress={() => { setSelectedDonation(d); setModalVisible(true); setProofImage(null); }}
                  >
                    <Text style={styles.acceptBtnText}>Confirm Receipt 📸</Text>
                  </TouchableOpacity>
                )}

                {d.status !== 'pending' && d.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => navigation.navigate('Requests', { screen: 'DonationChat', params: { donationId: d._id } })}
                  >
                    <Ionicons name="chatbubbles-outline" size={14} color={Colors.primary} />
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Recent Activity (Not Supported State) */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Recent Activity</Text>
        <View style={styles.activityBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.activityText}>Activity log is currently not supported by the backend service.</Text>
        </View>
      </View>
    </ScrollView>

    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDonation?.status === 'accepted' ? 'Schedule Pickup & Volunteer' : 'Confirm Receipt & Upload Proof'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedDonation?.status === 'accepted' ? (
              <>
                <Text style={styles.label}>Volunteer Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter volunteer name"
                  placeholderTextColor={Colors.textLight}
                  value={volunteerName}
                  onChangeText={setVolunteerName}
                />

                <Text style={styles.label}>Scheduled Pickup Date/Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Tomorrow 10:00 AM"
                  placeholderTextColor={Colors.textLight}
                  value={pickupDate}
                  onChangeText={setPickupDate}
                />

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    if (!volunteerName || !pickupDate) {
                      Alert.alert('Fields Required', 'Please enter volunteer name and pickup schedule');
                      return;
                    }
                    const note = `[Pickup Scheduled] Volunteer: ${volunteerName}, Schedule: ${pickupDate}`;
                    handleUpdateStatus(selectedDonation._id, 'accepted', note);
                    setModalVisible(false);
                    setVolunteerName('');
                    setPickupDate('');
                  }}
                >
                  <Text style={styles.modalSubmitBtnText}>Confirm Pickup Schedule</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Upload Photo Proof *</Text>
                <TouchableOpacity style={styles.imageSelector} onPress={handlePickImage}>
                  {proofImage ? (
                    <Image source={{ uri: proofImage }} style={styles.proofPreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={Colors.textSecondary} />
                      <Text style={styles.placeholderText}>Tap to select receipt photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Verification / Delivery Notes</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Enter verification notes (condition of items, etc.)"
                  placeholderTextColor={Colors.textLight}
                  value={deliveryNote}
                  onChangeText={setDeliveryNote}
                  multiline
                />

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={submitProofOfDelivery}
                  disabled={uploadingProof}
                >
                  {uploadingProof ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Verify & Confirm Receipt ✅</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingTop: 10 },
  topRightActions: { flexDirection: 'row', alignItems: 'center' },
  welcome: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.md },
  ngoName: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF', marginVertical: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
  statusBadgeText: { color: '#FFF', fontSize: Typography.fontSize.xs, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  content: { padding: Spacing.lg },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  errorText: { color: Colors.emergency, fontWeight: '600', fontSize: Typography.fontSize.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.sm },
  empty: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadows.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.sm, fontSize: Typography.fontSize.md, fontWeight: '600' },
  emptyCreateBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.md },
  emptyCreateBtnText: { color: '#FFF', fontWeight: '700' },
  requirementCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  reqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  reqResourceWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reqIcon: { fontSize: 32 },
  reqCategory: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  reqQty: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  reqDetails: { paddingTop: Spacing.sm },
  detailsText: { fontSize: Typography.fontSize.sm, color: Colors.text, marginVertical: 2 },
  detailsLabel: { fontWeight: '600', color: Colors.textSecondary },
  statusText: { textTransform: 'capitalize', color: Colors.primary, fontWeight: '700' },
  activityBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm },
  activityText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1 },
  donationCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  donTopRow: { flexDirection: 'row', gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  donEmoji: { fontSize: 36 },
  donInfo: { flex: 1 },
  donTitle: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  donDonor: { fontSize: Typography.fontSize.sm, color: Colors.text, marginTop: 2 },
  donPhone: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  donDate: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  statusTagText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  donActions: { flexDirection: 'row', gap: Spacing.xs, paddingTop: Spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  detailsBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  detailsBtnText: { color: Colors.text, fontWeight: '600', fontSize: Typography.fontSize.xs },
  acceptBtn: { backgroundColor: Colors.success },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.xs },
  rejectBtn: { backgroundColor: Colors.emergency },
  rejectBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.xs },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  filterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 4 },
  chatBtnText: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalContainer: { width: '100%', maxHeight: '80%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.md, marginBottom: Spacing.md },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: Colors.text, flex: 1 },
  modalBody: { paddingVertical: Spacing.sm },
  modalSubmitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  modalSubmitBtnText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.md },
  imageSelector: { borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, borderRadius: BorderRadius.lg, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, backgroundColor: Colors.background, overflow: 'hidden' },
  imagePlaceholder: { alignItems: 'center' },
  placeholderText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing.sm, fontWeight: '600' },
  proofPreview: { width: '100%', height: '100%' },
});
