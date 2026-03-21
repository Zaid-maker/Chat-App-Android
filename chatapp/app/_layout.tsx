import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { SOCKET_URL } from '@/constants/api';
import storage from '@/constants/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    const appSocket = io(SOCKET_URL);

    appSocket.on('connect', () => {
      console.log(`✅ APP: Connected to server at ${SOCKET_URL} | socketId=${appSocket.id}`);

      storage.getItem('userData').then((userData) => {
        if (!userData) return;

        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser?._id) {
            appSocket.emit('join', parsedUser._id);
          }
        } catch (error) {
          console.error('Failed to parse userData for socket join:', error);
        }
      });
    });

    appSocket.on('connect_error', (error) => {
      console.error(`❌ APP: Server connection failed at ${SOCKET_URL}:`, error.message);
    });

    return () => {
      appSocket.disconnect();
    };
  }, []);

  const CustomDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.brandBackground,
      card: Colors.light.brandBackground,
      border: 'transparent',
    },
  };

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.brandBackground,
      card: Colors.dark.brandBackground,
      border: 'transparent',
    },
  };

  const navigationTheme = colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.brandBackground },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dialer" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="privacy_security" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
