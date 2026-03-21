import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar as RNStatusBar, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import api from '@/constants/api';
import storage from '@/constants/storage';

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('Available');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const userData = await storage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        setName(parsed.fullName || parsed.username || '');
        setUsername(parsed.username || '');
        setBio(parsed.bio || '');
        setStatus(parsed.status || 'Available');
        setAvatar(parsed.avatar || '');
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handlePickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      const picked = result.assets?.[0]?.uri;
      if (!picked) return;

      setAvatar(picked);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to pick profile image:', error);
      Alert.alert('Error', 'Could not open image gallery.');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Validation', 'Username is required.');
      return;
    }

    setSaving(true);
    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.put(
        '/auth/me',
        {
          fullName: name.trim(),
          username: username.trim(),
          status: status.trim(),
          avatar,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await storage.setItem('userData', JSON.stringify(response.data));

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save profile changes.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer, { backgroundColor: theme.brandBackground }]}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color={theme.brandPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.slate200 }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.slate900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.doneButton, { color: theme.brandPrimary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: avatar || 'https://via.placeholder.com/128' }}
                style={[styles.avatar, { borderColor: theme.background }]}
              />
              <TouchableOpacity
                style={[styles.editBadge, { backgroundColor: theme.brandPrimary }]}
                onPress={handlePickProfileImage}
              >
                <Ionicons name="pencil" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handlePickProfileImage}>
              <Text style={[styles.changeText, { color: theme.brandPrimary }]}>Change Profile Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.slate500 }]}>FULL NAME</Text>
              <TextInput
                style={[styles.input, { color: theme.slate900, backgroundColor: theme.background, borderColor: theme.slate200 }]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                placeholder="Enter full name"
                placeholderTextColor={theme.slate400}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.slate500 }]}>USERNAME</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.atSign, { color: theme.slate400 }]}>@</Text>
                <TextInput
                  style={[styles.usernameInput, { color: theme.slate900, backgroundColor: theme.background, borderColor: theme.slate200 }]}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  placeholder="username"
                  placeholderTextColor={theme.slate400}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.slate500 }]}>BIO</Text>
              <TextInput
                style={[styles.textArea, { color: theme.slate900, backgroundColor: theme.background, borderColor: theme.slate200 }]}
                value={bio}
                onChangeText={(text) => {
                  setBio(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                placeholder="Tell us about yourself..."
                placeholderTextColor={theme.slate400}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.slate500 }]}>STATUS</Text>
              <View style={[styles.statusContainer, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
                <Ionicons name="flash-outline" size={20} color={theme.brandPrimary} />
                <TextInput
                  style={[styles.statusInput, { color: theme.slate900 }]}
                  value={status}
                  onChangeText={(text) => {
                    setStatus(text);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  placeholder="Set status"
                  placeholderTextColor={theme.slate400}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.brandPrimary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginLeft: 12,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  usernameContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  atSign: {
    position: 'absolute',
    left: 16,
    fontSize: 16,
    fontWeight: '500',
    zIndex: 1,
  },
  usernameInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 34,
    paddingRight: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  statusInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  saveButton: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
