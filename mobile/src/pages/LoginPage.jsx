import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons } from '@expo/vector-icons';

const LoginPage = () => {
  const navigation = useNavigation();
  const { login } = useAuth();
  const { settings } = useSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const error = await login(trimmedEmail, trimmedPassword);

    setIsLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      if (settings.passcode) {
        navigation.navigate('Lock', { redirectTo: 'Home' });
      } else {
        navigation.navigate('Home');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* LOGO */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="blur-on" size={40} color="#6366F1" />
            </View>
            <Text style={styles.logoText}>PATERA LEKHA</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your meeting transcripts</Text>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={obscurePassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.visibilityBtn}
                  onPress={() => setObscurePassword(!obscurePassword)}
                >
                  <MaterialIcons name={obscurePassword ? 'visibility-off' : 'visibility'} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View style={styles.forgotRow}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity 
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomLinkRow}>
            <Text style={styles.plainText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.linkBold}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginRight: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#090D1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#090D1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 14,
  },
  visibilityBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -8,
  },
  link: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  plainText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  linkBold: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default LoginPage;
