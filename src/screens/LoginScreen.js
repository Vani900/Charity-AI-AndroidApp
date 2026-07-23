/**
 * Login Screen – OTP + Password + Google Sign-In.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithOTP, loginWithPassword, clearError, setOtpSent } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    dispatch(clearError());
    if (!email) { Alert.alert('Error', 'Enter your email'); return; }
    if (!password) { Alert.alert('Error', 'Enter your password'); return; }
    await dispatch(loginWithPassword({ email, password }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
          <Text style={styles.logo}>⛓️</Text>
          <Text style={styles.appName}>CharityChain AI</Text>
          <Text style={styles.subtitle}>Login to make a difference</Text>
        </LinearGradient>

        {/* Card */}
        <View style={styles.card}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.loginGradient}>
              {isLoading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.loginText}>Login 🚀</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Link */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              New here? <Text style={styles.registerHighlight}>Create Account →</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1 },
  header: {
    paddingTop: 80, paddingBottom: 50, alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  logo: { fontSize: 60, marginBottom: 12 },
  appName: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: Typography.fontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    margin: Spacing.lg, padding: Spacing.xl, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, ...Shadows.lg, marginTop: -24,
  },
  modeToggle: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg,
  },
  modeBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md - 2,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, backgroundColor: Colors.background,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: Typography.fontSize.base, color: Colors.text },
  otpInput: { letterSpacing: 8, fontWeight: '700', fontSize: Typography.fontSize.xl },
  sendOtpBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
  },
  sendOtpText: { color: '#FFF', fontWeight: '700', fontSize: Typography.fontSize.md },
  resend: { alignSelf: 'flex-end', marginTop: 6 },
  resendText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm, flex: 1 },
  loginBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  loginGradient: { padding: Spacing.md + 2, alignItems: 'center' },
  loginText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  registerLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerText: { fontSize: Typography.fontSize.md, color: Colors.textSecondary },
  registerHighlight: { color: Colors.primary, fontWeight: '700' },
});
