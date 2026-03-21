import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import api from '@/constants/api';
import storage from '@/constants/storage';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('Sending register request...');
      const response = await api.post('/auth/register', {
        username: fullName,
        email,
        password
      });

      console.log('Register success:', response.data);
      const { token, ...user } = response.data;

      await storage.setItem('userToken', token);
      await storage.setItem('userData', JSON.stringify(user));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/messages' as any);
    } catch (err: any) {
      console.error('Register error details:', err.message, err.code, err.response?.status);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Check your server/network.';
      } else if (!err.response) {
        errorMessage = 'Network error. Is the server running?';
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.slate900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>{"Create Account"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Branding */}
          <View style={styles.heroSection}>
            <View style={[styles.logoContainer, { backgroundColor: theme.brandPrimary + '1A' }]}>
              <Ionicons name="chatbubble-ellipses" size={40} color={theme.brandPrimary} />
            </View>
            <Text style={[styles.title, { color: theme.slate900 }]}>{"Join the community"}</Text>
            <Text style={[styles.subtitle, { color: theme.slate500 }]}>
              {"Get started by creating your account and connecting with friends."}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.slate900 }]}>{"Full Name"}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.slate200, color: theme.slate900 }]}
                placeholder="John Doe"
                placeholderTextColor={theme.slate400}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setError('');
                }}
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.slate900 }]}>{"Email Address"}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.slate200, color: theme.slate900 }]}
                placeholder="example@mail.com"
                placeholderTextColor={theme.slate400}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.slate900 }]}>{"Password"}</Text>
              <View style={[styles.passwordWrapper, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.slate900 }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.slate400}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.slate400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.brandPrimary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.continueText}>{"Create Account"}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.slate200 }]} />
            <Text style={[styles.dividerText, { color: theme.slate400 }]}>{"OR"}</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.slate200 }]} />
          </View>

          {/* Social Sign Up */}
          <View style={styles.socialSection}>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXW8GM08sRA0mEiAB3vm-EpXzThHQF7iBCdDv9So22NZ6rUchOEdpxuC5I6RnBz5UmHT2Ys7WuzwaJJaV0DUFsmc38uf_j-mZf9Nbqaynj3BbA1YgBYNqszrHDGqLIVXTZDYyL4HnbvrdQnisFmC3eg1n1h2gSdXEBlVxOZdxvvYabsa5OZ_Il8WuPXnN2fAa6mYZ9DluvZWmy0ETAZ_atfjkEfyO8J_V3HezuXYgq2tajFxSyGuXlmV2TxlsBePUTJE_qZk7IaQ4U' }}
                style={styles.socialIcon}
              />
              <Text style={[styles.socialText, { color: theme.slate900 }]}>{"Sign up with Google"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
              <Ionicons name="logo-apple" size={20} color={theme.slate900} />
              <Text style={[styles.socialText, { color: theme.slate900 }]}>{"Sign up with Apple"}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.slate500 }]}>
              {"Already have an account? "}
              <Text style={[styles.loginLink, { color: theme.brandPrimary }]} onPress={() => router.push('/login')}>{"Log In"}</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  formSection: {
    paddingHorizontal: 24,
    gap: 16,
    marginTop: 10,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingLeft: 4,
  },
  textInput: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordWrapper: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  continueText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  socialSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  socialButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
  },
  loginLink: {
    fontWeight: '800',
  },
});

