import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../context/AuthContext';

// Import Screens (we will create these next)
import SplashPage from '../pages/SplashPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import OtpPage from '../pages/OtpPage';
import LockPage from '../pages/LockPage';

import HomePage from '../pages/HomePage';
import RecordingPage from '../pages/RecordingPage';
import TranscriptPage from '../pages/TranscriptPage';
import HistoryPage from '../pages/HistoryPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashPage />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Splash" component={SplashPage} />
            <Stack.Screen name="Login" component={LoginPage} />
            <Stack.Screen name="Signup" component={SignupPage} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
            <Stack.Screen name="Otp" component={OtpPage} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Lock" component={LockPage} />
            <Stack.Screen name="Home" component={HomePage} />
            <Stack.Screen name="Recording" component={RecordingPage} />
            <Stack.Screen name="Transcript" component={TranscriptPage} />
            <Stack.Screen name="History" component={HistoryPage} />
            <Stack.Screen name="Profile" component={ProfilePage} />
            <Stack.Screen name="Settings" component={SettingsPage} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
