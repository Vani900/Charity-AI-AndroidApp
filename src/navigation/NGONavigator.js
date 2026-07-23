/**
 * NGO Navigator – tab screens wrapped in stack for NGO module.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

import NGODashboardScreen from '../screens/ngo/NGODashboardScreen';
import RequirementManagementScreen from '../screens/ngo/RequirementManagementScreen';
import DonationRequestsScreen from '../screens/ngo/DonationRequestsScreen';
import NGOAnalyticsScreen from '../screens/ngo/NGOAnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DonationChatScreen from '../screens/DonationChatScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestsMain" component={DonationRequestsScreen} />
      <Stack.Screen name="DonationChat" component={DonationChatScreen} />
    </Stack.Navigator>
  );
}

function NGOTabNavigator() {
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
      <Tab.Screen name="Requests" component={RequestsStack} />
      <Tab.Screen name="Analytics" component={NGOAnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function NGONavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NGOTabs" component={NGOTabNavigator} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    </Stack.Navigator>
  );
}
