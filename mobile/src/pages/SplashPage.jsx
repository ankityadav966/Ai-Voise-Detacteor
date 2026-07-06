import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons } from '@expo/vector-icons';

const SplashPage = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (authLoading) return;

    const timer = setTimeout(() => {
      // In AppNavigator, Splash is only in Auth stack, so we only need to redirect if not auth'd.
      // If auth'd, AppNavigator automatically switches to Main stack.
      // However, if we're waiting here, and auth finishes, AppNavigator re-renders.
      // So SplashPage might unmount. But just in case, we do replace.
      if (!isAuthenticated) {
        navigation.replace('Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, navigation, pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialIcons name="blur-on" size={72} color="#6366F1" />
        </Animated.View>
        <Text style={styles.title}>PATERA LEKHA</Text>
        <Text style={styles.subtitle}>AI Meeting Assistant</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    padding: 24,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    letterSpacing: 1,
    fontWeight: '500',
  },
});

export default SplashPage;
