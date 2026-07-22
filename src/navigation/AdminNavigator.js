/**
 * Admin Navigator.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import NGOVerificationScreen from '../screens/admin/NGOVerificationScreen';
import DonationMonitoringScreen from '../screens/admin/DonationMonitoringScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import AnalyticsDashboardScreen from '../screens/admin/AnalyticsDashboardScreen';
import FraudDetectionScreen from '../screens/admin/FraudDetectionScreen';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface, height: 65, paddingBottom: 10 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Overview: focused ? 'speedometer' : 'speedometer-outline',
            'NGO Review': focused ? 'checkmark-circle' : 'checkmark-circle-outline',
            Donations: focused ? 'gift' : 'gift-outline',
            Users: focused ? 'people' : 'people-outline',
            Analytics: focused ? 'analytics' : 'analytics-outline',
            Fraud: focused ? 'shield' : 'shield-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={AdminDashboardScreen} />
      <Tab.Screen name="NGO Review" component={NGOVerificationScreen} />
      <Tab.Screen name="Donations" component={DonationMonitoringScreen} />
      <Tab.Screen name="Users" component={UserManagementScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsDashboardScreen} />
      <Tab.Screen name="Fraud" component={FraudDetectionScreen} />
    </Tab.Navigator>
  );
}
