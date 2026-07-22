/**
 * Splash Screen – animated app loading.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../utils/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]} style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.circle, { top: -60, right: -60, opacity: 0.1 }]} />
      <View style={[styles.circle, { bottom: 100, left: -80, width: 200, height: 200, opacity: 0.08 }]} />

      <Animated.View style={[styles.logoContainer, { transform: [{ scale }], opacity }]}>
        <Text style={styles.logo}>⛓️</Text>
        <Text style={styles.appName}>CharityChain AI</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Smart Donations. Real Impact.{'\n'}Powered by AI & Blockchain.
      </Animated.Text>

      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 80, marginBottom: 16 },
  appName: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.fontSize.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: '#FFFFFF', width: 24, borderRadius: 4 },
});
