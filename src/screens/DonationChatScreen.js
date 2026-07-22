/**
 * Donation Chat Screen – coordinate pickups & communicate between Donor and NGO.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { donationsAPI, ngosAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';

export default function DonationChatScreen({ route, navigation }) {
  const { donationId } = route.params;
  const { user } = useSelector((s) => s.auth);
  const scrollViewRef = useRef();

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadDonation();
    loadMessages();

    // Set up short-polling for message updates (every 3 seconds)
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [donationId]);

  const loadDonation = async () => {
    try {
      const { data: res } = await donationsAPI.getTracking(donationId);
      if (res.success && res.data?.donationId) {
        setDonation(res.data.donationId);
      }
    } catch (e) {
      console.warn('Failed to load donation details for chat:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(`donation_chat_${donationId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load chat messages:', e.message);
    }
  };

  const sendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    if (text.length > 500) {
      Alert.alert('Error', 'Message cannot exceed 500 characters');
      return;
    }

    setSending(true);
    try {
      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        createdAt: new Date().toISOString(),
        user: {
          _id: user._id,
          name: user.name,
          role: user.role,
        },
      };

      const updated = [...messages, newMsg];
      setMessages(updated);
      await AsyncStorage.setItem(`donation_chat_${donationId}`, JSON.stringify(updated));
      setInputText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Perform quick update coordination messages + status updates on backend
  const handleQuickStatusUpdate = async (status, msgText) => {
    try {
      setSending(true);
      // 1. Call API to update the status in the backend
      await ngosAPI.updateStatus(donationId, status, msgText);
      // 2. Append message indicating status change to chat
      await sendMessage(msgText);
      // 3. Refresh donation details
      await loadDonation();
      Alert.alert('Status Updated! ✅', `Donation status updated to ${status}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update status on backend');
    } finally {
      setSending(false);
    }
  };

  // Participant Authorization Verification
  if (donation) {
    const isDonor = user.role === 'donor';
    const isNgo = user.role === 'ngo';
    
    const donorMatchId = donation.donorId?._id || donation.donorId;
    const ngoMatchId = donation.assignedNgoId?._id || donation.assignedNgoId;

    if (isDonor && donorMatchId !== user._id) {
      return (
        <View style={styles.errorBox}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Unauthorized access: You do not own this donation.</Text>
        </View>
      );
    }
    if (isNgo && ngoMatchId !== user._id) {
      return (
        <View style={styles.errorBox}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Unauthorized access: This request is not assigned to you.</Text>
        </View>
      );
    }
  }

  if (loading && !donation) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const partnerName = user.role === 'donor' 
    ? donation?.assignedNgoId?.name || 'NGO Partner' 
    : donation?.donorId?.name || 'Donor';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
          <Text style={styles.donationId}>ID: #{donationId.slice(-6).toUpperCase()} • {donation?.category?.toUpperCase()}</Text>
        </View>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>{donation?.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={{ paddingVertical: Spacing.md }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>Start coordinating pickup details below!</Text>
          </View>
        ) : (
          messages.map((m) => {
            const isMe = m.user._id === user._id;
            return (
              <View key={m.id} style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.senderName, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: Colors.textSecondary }]}>
                    {m.user.name}
                  </Text>
                  <Text style={[styles.messageText, isMe ? { color: '#FFF' } : { color: Colors.text }]}>
                    {m.text}
                  </Text>
                  <Text style={[styles.timestamp, isMe ? { color: 'rgba(255,255,255,0.5)' } : { color: Colors.textLight }]}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* NGO Coordination Templates */}
      {user.role === 'ngo' && donation?.status !== 'delivered' && (
        <View style={styles.ngoTemplatesContainer}>
          <Text style={styles.templateLabel}>Quick Update templates:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesRow}>
            {donation?.status === 'pending' && (
              <TouchableOpacity
                style={styles.templateBtn}
                onPress={() => handleQuickStatusUpdate('accepted', 'Your donation has been accepted.')}
              >
                <Text style={styles.templateBtnText}>✓ Accept</Text>
              </TouchableOpacity>
            )}
            {donation?.status === 'accepted' && (
              <>
                <TouchableOpacity
                  style={styles.templateBtn}
                  onPress={() => handleQuickStatusUpdate('accepted', 'We are preparing for pickup.')}
                >
                  <Text style={styles.templateBtnText}>📦 Preparing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.templateBtn}
                  onPress={() => handleQuickStatusUpdate('in_transit', 'Pickup complete, items in transit.')}
                >
                  <Text style={styles.templateBtnText}>🚚 Set In Transit</Text>
                </TouchableOpacity>
              </>
            )}
            {donation?.status === 'in_transit' && (
              <TouchableOpacity
                style={styles.templateBtn}
                onPress={() => handleQuickStatusUpdate('delivered', 'The donation has been delivered.')}
              >
                <Text style={styles.templateBtnText}>🏁 Confirm Delivery</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Message input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={sending || !inputText.trim()}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingTop: 50, paddingBottom: Spacing.md, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: Colors.border, ...Shadows.sm
  },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerInfo: { flex: 1 },
  partnerName: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.text },
  donationId: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  statusBox: { backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.md },
  statusLabel: { color: Colors.primary, fontWeight: '800', fontSize: 10 },
  messagesList: { flex: 1, paddingHorizontal: Spacing.md },
  messageRow: { flexDirection: 'row', marginVertical: 4 },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  messageBubble: { padding: Spacing.md, borderRadius: BorderRadius.lg, maxWidth: '75%' },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 2 },
  senderName: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  messageText: { fontSize: Typography.fontSize.sm },
  timestamp: { fontSize: 9, textAlign: 'right', marginTop: 4 },
  ngoTemplatesContainer: { backgroundColor: '#F1F5F9', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  templateLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  templatesRow: { flexDirection: 'row' },
  templateBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, marginRight: Spacing.sm },
  templateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: Colors.border
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 80, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 8,
    fontSize: Typography.fontSize.sm, color: Colors.text, backgroundColor: Colors.background
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing.md, textAlign: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.md, fontWeight: '700', marginTop: Spacing.md, textAlign: 'center' }
});
