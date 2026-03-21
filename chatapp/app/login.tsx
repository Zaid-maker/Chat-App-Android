import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, TextInput, Platform, StatusBar as RNStatusBar, Image, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import api from '@/constants/api';
import storage from '@/constants/storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...user } = response.data;

      // Store token and user info
      await storage.setItem('userToken', token);
      await storage.setItem('userData', JSON.stringify(user));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/messages' as any);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: theme.slate200 + '33' }]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color={theme.slate900} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.slate900 }]}>{"Log In"}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.content}>
            {/* Logo/Icon */}
            <View style={[styles.logoContainer, { backgroundColor: theme.brandPrimary + '1A' }]}>
              <Ionicons name="chatbubble" size={48} color={theme.brandPrimary} />
            </View>

            <Text style={[styles.title, { color: theme.slate900 }]}>{"Welcome Back"}</Text>
            <Text style={[styles.subtitle, { color: theme.slate500 }]}>
              {"Enter your credentials to continue chatting with your friends"}
            </Text>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.slate900 }]}>{"Email Address"}</Text>
                <View style={[styles.inputWrapper, { borderColor: theme.slate200, backgroundColor: theme.slate200 + '1A' }]}>
                  <Ionicons name="mail-outline" size={20} color={theme.slate400} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.slate900 }]}
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
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.slate900 }]}>{"Password"}</Text>
                <View style={[styles.inputWrapper, { borderColor: theme.slate200, backgroundColor: theme.slate200 + '1A' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.slate400} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.slate900 }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.slate400}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError('');
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.slate400} 
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: theme.brandPrimary }]}>{"Forgot Password?"}</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.brandPrimary, shadowColor: theme.brandPrimary, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{"Log In"}</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.slate200 }]} />
                <Text style={[styles.dividerText, { color: theme.slate400 }]}>{"OR"}</Text>
                <View style={[styles.divider, { backgroundColor: theme.slate200 }]} />
              </View>

              {/* Social Logins */}
              <View style={styles.socialContainer}>
                <TouchableOpacity style={[styles.socialButton, { borderColor: theme.slate200 }]}>
                  <Image 
                    source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG_cJhlkQpyESnILlkQpz7WiBgozLugIUJ__n84xKqYP-CalETKBPegW8ZrrzxLx3RtiO6DeHROeh4fw7-i0pJrN3jk6RE6AS4HDLWF27caC2ee797QuNun368kEoAPr4LLBovids_gvOMgCK5WNmkDIK8qNvio1Slsp3LdRSKQYRu-92_R9rMjHWfMs3BHDjXK82BNA0Fh7jsuIrrU_wsHiOitD52u0PO8L9I7PV132Crd85opJpwpsOl-e150jnGHEg0RYF6HfZW' }} 
                    style={styles.socialIcon} 
                  />
                  <Text style={[styles.socialText, { color: theme.slate900 }]}>{"Google"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.socialButton, { borderColor: theme.slate200 }]}>
                  <Ionicons name="logo-apple" size={20} color={theme.slate900} />
                  <Text style={[styles.socialText, { color: theme.slate900 }]}>{"Apple"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.slate200 + '33' }]}>
            <Text style={[styles.footerText, { color: theme.slate500 }]}>
              {"Don't have an account? "}
              <Text 
                style={[styles.link, { color: theme.brandPrimary }]}
                onPress={() => router.push('/signup')}
              >
                {"Sign Up"}
              </Text>
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
  scrollContent: {
    flexGrow: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  form: {
    width: '100%',
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingRight: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
    borderColor: 'transparent',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  link: {
    fontWeight: '700',
  },
});


