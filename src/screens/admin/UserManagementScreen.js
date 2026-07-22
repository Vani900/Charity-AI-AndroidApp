/**
 * User Management Screen – Admin.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: res } = await adminAPI.getUsers(roleFilter || undefined);
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load users:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (user) => {
    Alert.alert(user.isActive ? 'Deactivate User?' : 'Activate User?',
      `${user.isActive ? 'Disable' : 'Enable'} account for ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.isActive ? 'Deactivate' : 'Activate',
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminAPI.toggleUser(user._id);
              loadUsers();
            } catch (e) { Alert.alert('Error', 'Failed to update user'); }
          },
        },
      ]
    );
  };

  const ROLE_COLORS = { donor: Colors.info, ngo: Colors.success, admin: Colors.warning };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <Text style={styles.headerTitle}>User Management 👥</Text>
        <View style={styles.roleFilters}>
          {['', 'donor', 'ngo', 'admin'].map((r) => (
            <TouchableOpacity key={r} style={[styles.roleChip, roleFilter === r && styles.roleChipActive]} onPress={() => setRoleFilter(r)}>
              <Text style={[styles.roleChipText, roleFilter === r && styles.roleChipTextActive]}>{r || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {item.isVerified && <Ionicons name="checkmark-circle" size={16} color={Colors.success} />}
                </View>
                <Text style={styles.userPhone}>{item.phone}</Text>
                {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
              </View>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[item.role] || Colors.primary) + '20' }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || Colors.primary }]}>{item.role}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: item.isActive ? Colors.success + '20' : Colors.error + '20' }]}
                  onPress={() => handleToggle(item)}
                >
                  <Text style={[styles.toggleBtnText, { color: item.isActive ? Colors.success : Colors.error }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}><Text style={styles.emptyIcon}>👤</Text><Text style={styles.emptyText}>No users found</Text></View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF', marginBottom: Spacing.md },
  roleFilters: { flexDirection: 'row', gap: Spacing.sm },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  roleChipActive: { backgroundColor: Colors.primary },
  roleChipText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
  roleChipTextActive: { color: '#FFF', fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.lg },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  userPhone: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
  userEmail: { color: Colors.textLight, fontSize: Typography.fontSize.xs, marginTop: 1 },
  userMeta: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  roleText: { fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  toggleBtnText: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 64 },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.fontSize.lg, fontWeight: '600' },
});
