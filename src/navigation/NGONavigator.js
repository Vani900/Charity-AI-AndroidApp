/**
 * NGO Navigator – stack screens for NGO module.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

import NGODashboardScreen from '../screens/ngo/NGODashboardScreen';
import RequirementManagementScreen from '../screens/ngo/RequirementManagementScreen';
import DonationRequestsScreen from '../screens/ngo/DonationRequestsScreen';
import NGOAnalyticsScreen from '../screens/ngo/NGOAnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function NGONavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface, height: 65, paddingBottom: 10 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Requirements: focused ? 'list' : 'list-outline',
            Requests: focused ? 'mail' : 'mail-outline',
            Analytics: focused ? 'analytics' : 'analytics-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={NGODashboardScreen} />
      <Tab.Screen name="Requirements" component={RequirementManagementScreen} />
      <Tab.Screen name="Requests" component={DonationRequestsScreen} />
      <Tab.Screen name="Analytics" component={NGOAnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
