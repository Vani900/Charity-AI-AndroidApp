/**
 * Register Screen.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../redux/slices/authSlice';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/theme';

const ROLES = [
  { value: 'donor', label: '🙋 Donor', desc: 'I want to donate' },
  { value: 'ngo', label: '🏢 NGO', desc: 'I represent an NGO' },
];

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'donor',
    address: '',
    registrationNumber: '',
    ngoDescription: '',
    establishedYear: '',
    website: '',
  });
  const [showPass, setShowPass] = useState(false);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.email || !form.password) {
      Alert.alert('Missing Fields', 'Name, phone, email, and password are required');
      return;
    }

    if (form.role === 'ngo') {
      if (!form.registrationNumber || !form.ngoDescription) {
        Alert.alert('Missing NGO Fields', 'Registration number and description are required for NGOs');
        return;
      }
      if (form.ngoDescription.length < 10) {
        Alert.alert('Invalid Description', 'NGO description must be at least 10 characters');
        return;
      }
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: form.role,
      address: form.address || 'Not specified',
    };

    if (form.role === 'ngo') {
      payload.ngoDetails = {
        registrationNumber: form.registrationNumber,
        description: form.ngoDescription,
        website: form.website || undefined,
        establishedYear: form.establishedYear ? parseInt(form.establishedYear) : undefined,
      };
    }

    const result = await dispatch(registerUser(payload));
    if (!result.error) {
      Alert.alert('Success! 🎉', 'Account created successfully. Please login.', [
        { text: 'Login', onPress: () => navigation.replace('Login') },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the CharityChain network</Text>
        </LinearGradient>

        <View style={styles.card}>
          {/* Role Selection */}
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, form.role === r.value && styles.roleBtnActive]}
                onPress={() => update('role', r.value)}
              >
                <Text style={[styles.roleLabel, form.role === r.value && styles.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleDesc, form.role === r.value && { color: Colors.primary }]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* General Fields */}
          {[
            { key: 'name', icon: 'person-outline', placeholder: 'Full Name *', type: 'default' },
            { key: 'phone', icon: 'call-outline', placeholder: 'Phone Number *', type: 'phone-pad' },
            { key: 'email', icon: 'mail-outline', placeholder: 'Email Address *', type: 'email-address' },
            { key: 'address', icon: 'location-outline', placeholder: 'Address / Area *', type: 'default' },
          ].map((f) => (
            <View key={f.key} style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Ionicons name={f.icon} size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textLight}
                  value={form[f.key]}
                  onChangeText={(v) => update(f.key, v)}
                  keyboardType={f.type}
                  autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
                />
              </View>
            </View>
          ))}

          {/* Conditional NGO details fields */}
          {form.role === 'ngo' && (
            <>
              <Text style={[styles.label, { marginTop: Spacing.sm }]}>NGO Details</Text>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="NGO Registration Number *"
                    placeholderTextColor={Colors.textLight}
                    value={form.registrationNumber}
                    onChangeText={(v) => update('registrationNumber', v)}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Established Year (e.g. 2010)"
                    placeholderTextColor={Colors.textLight}
                    value={form.establishedYear}
                    onChangeText={(v) => update('establishedYear', v)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <Ionicons name="globe-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Website (e.g. https://myngo.org)"
                    placeholderTextColor={Colors.textLight}
                    value={form.website}
                    onChangeText={(v) => update('website', v)}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputRow, { height: 80, alignItems: 'flex-start', paddingTop: 8 }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color={Colors.textSecondary} style={[styles.inputIcon, { marginTop: 4 }]} />
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="NGO Mission & Description * (min 10 chars)"
                    placeholderTextColor={Colors.textLight}
                    value={form.ngoDescription}
                    onChangeText={(v) => update('ngoDescription', v)}
                    multiline
                  />
                </View>
              </View>
            </>
          )}

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password * (min 6 chars)"
                placeholderTextColor={Colors.textLight}
                value={form.password}
                onChangeText={(v) => update('password', v)}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.btnGradient}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Create Account 🚀</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? <Text style={styles.loginHighlight}>Login</Text></Text>
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
    paddingTop: 60, paddingBottom: 50, paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  back: { marginBottom: Spacing.md },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: Typography.fontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    margin: Spacing.lg, padding: Spacing.xl, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, ...Shadows.lg, marginTop: -24,
  },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  roleBtn: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  roleLabel: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.text },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  inputGroup: { marginBottom: Spacing.md },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, backgroundColor: Colors.background,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: Typography.fontSize.base, color: Colors.text },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.fontSize.sm },
  btn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  btnGradient: { padding: Spacing.md + 2, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.lg },
  loginLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  loginText: { fontSize: Typography.fontSize.md, color: Colors.textSecondary },
  loginHighlight: { color: Colors.primary, fontWeight: '700' },
});
