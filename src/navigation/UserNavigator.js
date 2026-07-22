/**
 * User Navigator – bottom tabs + stack screens.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import { useSelector } from 'react-redux';

import HomeScreen from '../screens/HomeScreen';
import DonationFormScreen from '../screens/DonationFormScreen';
import DonationTrackingScreen from '../screens/DonationTrackingScreen';
import ImpactDashboardScreen from '../screens/ImpactDashboardScreen';
import EmergencyModeScreen from '../screens/EmergencyModeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import DonationChatScreen from '../screens/DonationChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="DonationForm" component={DonationFormScreen} />
      <Stack.Screen name="DonationTracking" component={DonationTrackingScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
      <Stack.Screen name="DonationChat" component={DonationChatScreen} />
    </Stack.Navigator>
  );
}

export default function UserNavigator() {
  const unreadCount = useSelector((s) => s.notifications.unreadCount);
  const hasAlerts = useSelector((s) => s.emergency.hasActiveAlerts);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Donate: focused ? 'heart' : 'heart-outline',
            Emergency: focused ? 'warning' : 'warning-outline',
            Impact: focused ? 'bar-chart' : 'bar-chart-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Donate" component={DonationFormScreen} />
      <Tab.Screen
        name="Emergency"
        component={EmergencyModeScreen}
        options={{
          tabBarBadge: hasAlerts ? '!' : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.emergency },
          tabBarActiveTintColor: Colors.emergency,
        }}
      />
      <Tab.Screen name="Impact" component={ImpactDashboardScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
