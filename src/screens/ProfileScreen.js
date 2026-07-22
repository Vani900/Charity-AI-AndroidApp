/**
 * Profile Screen – user profile management with avatar, stats, settings.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, logout } from '../redux/slices/authSlice';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';
import { fetchDonations } from '../redux/slices/donationSlice';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((s) => s.auth);
  const { list: donations } = useSelector((s) => s.donations);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', bio: user?.bio || '' });

  const handleSave = async () => {
    const result = await dispatch(updateProfile(form));
    if (!result.error) {
      setEditing(false);
      Alert.alert('Profile Updated! ✅');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const totalDonations = donations.length;
  const verifiedDonations = donations.filter((d) => d.status === 'verified').length;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          {user?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Donations', value: totalDonations, icon: '🎁' },
            { label: 'Verified', value: verifiedDonations, icon: '✅' },
            { label: 'Rank', value: totalDonations >= 10 ? 'Gold' : 'Silver', icon: '🏆' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Edit Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Ionicons name={editing ? 'close' : 'create-outline'} size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {editing ? (
            <>
              {[
                { label: 'Name', key: 'name', icon: 'person-outline' },
                { label: 'Email', key: 'email', icon: 'mail-outline' },
                { label: 'Bio', key: 'bio', icon: 'information-circle-outline' },
              ].map((f) => (
                <View key={f.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name={f.icon} size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                      placeholder={f.label}
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
                <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.saveBtnGradient}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { label: 'Name', value: user?.name, icon: 'person-outline' },
                { label: 'Email', value: user?.email || 'Not set', icon: 'mail-outline' },
                { label: 'Phone', value: user?.phone, icon: 'call-outline' },
                { label: 'Role', value: user?.role, icon: 'shield-outline' },
              ].map((item, i) => (
                <View key={i} style={styles.profileRow}>
                  <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                  <View>
                    <Text style={styles.profileLabel}>{item.label}</Text>
                    <Text style={styles.profileValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          {[
            { icon: 'gift-outline', label: 'My Donations', action: () => navigation.navigate('Home') },
            { icon: 'bar-chart-outline', label: 'Impact Dashboard', action: () => navigation.navigate('Impact') },
            { icon: 'notifications-outline', label: 'Notifications', action: () => navigation.navigate('Notifications') },
            { icon: 'shield-checkmark-outline', label: 'Blockchain Records', action: () => Alert.alert('Coming Soon', 'Blockchain explorer coming soon') },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.action}>
              <Ionicons name={item.icon} size={22} color={Colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: Typography.fontSize['3xl'], fontWeight: '800', color: '#FFF' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#FFF', borderRadius: 10,
  },
  name: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm, marginTop: 2, letterSpacing: 1 },
  phone: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.md, marginTop: 4 },
  content: { padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', ...Shadows.sm,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.text },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  profileLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  profileValue: { fontSize: Typography.fontSize.md, color: Colors.text, fontWeight: '600', marginTop: 2 },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.background },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: Typography.fontSize.base, color: Colors.text },
  saveBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  saveBtnGradient: { padding: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuLabel: { fontSize: Typography.fontSize.md, color: Colors.text, fontWeight: '600', flex: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: '#FEE2E2', borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing['2xl'],
  },
  logoutText: { color: Colors.error, fontWeight: '700', fontSize: Typography.fontSize.md },
});
