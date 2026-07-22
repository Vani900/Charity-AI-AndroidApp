/**
 * Notification Center Screen.
 */

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markNotificationRead } from '../redux/slices/notificationSlice';
import { notificationsAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';

const TYPE_ICONS = {
  donation_accepted: '✅',
  pickup_scheduled: '📅',
  delivery_completed: '📦',
  emergency_request: '🚨',
  ngo_verified: '🏢',
  ngo_rejected: '❌',
  general: '🔔',
  fraud_alert: '⚠️',
};

export default function NotificationCenterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list, isLoading } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  const handleRead = (id) => dispatch(markNotificationRead(id));

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    dispatch(fetchNotifications());
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.cardUnread]}
      onPress={() => handleRead(item.id)}
    >
      <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>{item.title}</Text>
        <Text style={styles.notifMsg}>{item.message}</Text>
        <Text style={styles.notifTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications 🔔</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchNotifications())} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: Spacing.xl },
  back: { marginBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  markAll: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.sm, fontWeight: '600' },
  list: { padding: Spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  cardUnread: { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: Colors.primary },
  notifIcon: { fontSize: 28 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: Typography.fontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  notifTitleUnread: { color: Colors.text, fontWeight: '700' },
  notifMsg: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },
  notifTime: { fontSize: Typography.fontSize.xs, color: Colors.textLight, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 6 },
  emptyState: { alignItems: 'center', padding: Spacing['3xl'] },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, marginTop: 4, fontSize: Typography.fontSize.md },
});
