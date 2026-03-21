import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Animated, SafeAreaView, Platform, StatusBar as RNStatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import storage from '@/constants/storage';
import api from '@/constants/api';

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(true);
  
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const token = await storage.getItem('userToken');
        if (token) {
          const meResponse = await api.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          await storage.setItem('userData', JSON.stringify(meResponse.data));
          router.replace('/(tabs)/messages' as any);
          return;
        }
      } catch (error) {
        await storage.removeItem('userToken');
        await storage.removeItem('userData');
        console.log('Session token invalid or expired. Cleared local session.');
      } finally {
        if (isMounted) setIsBootstrappingSession(false);
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleGetStarted = () => {
    router.push('/signup');
  };

  if (isBootstrappingSession) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredContainer, { backgroundColor: theme.brandBackground }]}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color={theme.brandPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />
      
      {/* Background Decorations */}
      <View style={[styles.decoration1, { backgroundColor: theme.brandPrimary + '1A' }]} />
      <View style={[styles.decoration2, { backgroundColor: theme.brandSecondary + '1A' }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
            <Animated.View style={[
              styles.imageWrapper,
              { transform: [{ translateY: floatAnim }] }
            ]}>
              <View style={[styles.pulseCircle, { backgroundColor: theme.brandPrimary + '0D' }]} />
              <Image 
                source={require('@/assets/images/chat-hero.png')} 
                style={styles.heroImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {/* Text Section */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.slate900 }]}>
              Stay <Text style={{ color: theme.brandPrimary }}>connected</Text>{'\n'}with your world
            </Text>
            <Text style={[styles.subtitle, { color: theme.slate500 }]}>
              The simplest and most secure way to chat with friends, family, and colleagues.
            </Text>
          </View>

          {/* Action Buttons Section */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: theme.brandPrimary }]}
              activeOpacity={0.8}
              onPress={handleGetStarted}
            >
              <Text style={styles.mainButtonText}>Get Started</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.slate200 }]} />
              <Text style={[styles.dividerText, { color: theme.slate400 }]}>OR LOGIN WITH</Text>
              <View style={[styles.divider, { backgroundColor: theme.slate200 }]} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={[styles.socialButtonText, { color: theme.slate900 }]}>Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#000', borderColor: '#000' }]}>
                <Ionicons name="logo-apple" size={20} color="#FFF" />
                <Text style={[styles.socialButtonText, { color: '#FFF' }]}>Apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => router.push('/login')}
            >
              <Text style={[styles.loginText, { color: theme.slate500 }]}>
                Already have an account? <Text style={[styles.loginTextBold, { color: theme.brandPrimary }]}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.slate400 }]}>
              {"By clicking Get Started, you agree to our"}{'\n'}
              <Text style={styles.underline}>{"Terms of Service"}</Text>
              {" and "}
              <Text style={styles.underline}>{"Privacy Policy"}</Text>
              {"."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  decoration1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decoration2: {
    position: 'absolute',
    top: '50%',
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  illustrationContainer: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pulseCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  heroImage: {
    width: 260,
    height: 260,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  mainButton: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
    letterSpacing: 1.5,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginTextBold: {
    fontWeight: '700',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});
