/**
 * Onboarding Screen – 3-step introduction.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../utils/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1', emoji: '🤝', title: 'Smart Donations',
    subtitle: 'AI matches your donation with the right NGO based on location, urgency, and resource needs.',
    gradient: [Colors.primaryDark, Colors.primary],
  },
  {
    id: '2', emoji: '🚨', title: 'Emergency Mode',
    subtitle: 'Get real-time alerts for blood needs, flood relief, and medical emergencies near you. Act instantly.',
    gradient: ['#B91C1C', '#EF4444'],
  },
  {
    id: '3', emoji: '⛓️', title: 'Blockchain Trust',
    subtitle: 'Every donation is recorded on blockchain for complete transparency and tamper-proof verification.',
    gradient: ['#1D4ED8', Colors.primary],
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const slide = SLIDES[currentIndex];

  return (
    <LinearGradient colors={slide.gradient} style={styles.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    width, flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 80,
  },
  emoji: { fontSize: 100, marginBottom: Spacing.xl },
  title: {
    fontSize: Typography.fontSize['3xl'], fontWeight: '800',
    color: '#FFFFFF', textAlign: 'center', marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.fontSize.md, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 26,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 28, backgroundColor: '#FFFFFF', borderRadius: 4 },
  buttons: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: 50,
  },
  skipBtn: { padding: Spacing.md },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.md },
  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nextText: { color: '#FFFFFF', fontWeight: '700', fontSize: Typography.fontSize.md },
});
