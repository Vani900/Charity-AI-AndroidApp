/**
 * App Navigator – root navigation with role-based routing.
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { loadStoredAuth } from '../redux/slices/authSlice';

import * as SplashScreenModule from 'expo-splash-screen';

import UserNavigator from './UserNavigator';
import NGONavigator from './NGONavigator';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await dispatch(loadStoredAuth());
      } catch (e) {
        console.warn('Error loading auth state:', e);
      } finally {
        setIsReady(true);
        await SplashScreenModule.hideAsync().catch(() => {});
      }
    };
    init();
  }, []);

  if (!isReady) return <SplashScreen />;

  const getNavigator = () => {
    if (!isAuthenticated) return <AuthNavigator />;
    switch (user?.role) {
      case 'admin': return <AdminNavigator />;
      case 'ngo': return <NGONavigator />;
      default: return <UserNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {getNavigator()}
    </NavigationContainer>
  );
}
