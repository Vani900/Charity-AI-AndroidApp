/**
 * CharityChain AI – Design System & Theme
 */

export const Colors = {
  primary: '#2E8B57',       // Sea green
  primaryDark: '#1F6B42',
  primaryLight: '#4CAF50',
  secondary: '#4CAF50',
  accent: '#FFD700',        // Gold for impact highlights
  accentOrange: '#FF8C00',  // Emergency
  accentRed: '#DC3545',     // Critical

  // Background
  background: '#F8FFF9',
  backgroundDark: '#0D1F12',
  surface: '#FFFFFF',
  surfaceDark: '#1A2F1E',
  card: '#FFFFFF',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Donation type colors
  money: '#10B981',
  food: '#F59E0B',
  clothes: '#8B5CF6',
  books: '#3B82F6',
  medicines: '#EF4444',
  blood: '#DC2626',

  // Gradient stops
  gradientStart: '#2E8B57',
  gradientEnd: '#4CAF50',

  // Misc
  border: '#E5E7EB',
  divider: '#F3F4F6',
  shadow: 'rgba(46, 139, 87, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  emergency: '#FF3B30',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'monospace',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const DonationTypeIcons = {
  money: '💰',
  food: '🍚',
  clothes: '👕',
  books: '📚',
  medicines: '💊',
  blood: '🩸',
  other: '📦',
};

export const StatusColors = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  pickup_scheduled: '#8B5CF6',
  picked_up: '#0EA5E9',
  in_transit: '#F97316',
  delivered: '#10B981',
  verified: '#2E8B57',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

export default { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons, StatusColors };
