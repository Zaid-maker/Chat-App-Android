import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Image, ScrollView, Platform, StatusBar as RNStatusBar, ActivityIndicator, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import api from '@/constants/api';
import storage from '@/constants/storage';

type CurrentUser = {
  _id: string;
  fullName?: string;
  username: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  status?: string;
};

export default function SettingsScreen() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const loadCurrentUser = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const token = await storage.getItem('userToken');
      const cachedUser = await storage.getItem('userData');

      if (!token) {
        router.replace('/login');
        return;
      }

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // Ignore malformed cache and continue with API fetch.
        }
      }

      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data);
      await storage.setItem('userData', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser(false);
    }, [loadCurrentUser])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCurrentUser(false);
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleOpenPhoneModal = () => {
    setPhoneDraft(user?.phoneNumber || '');
    setIsPhoneModalVisible(true);
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.put(
        '/auth/me',
        {
          phoneNumber: phoneDraft,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(response.data);
      await storage.setItem('userData', JSON.stringify(response.data));
      setIsPhoneModalVisible(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update phone number.';
      Alert.alert('Error', message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await storage.removeItem('userToken');
          await storage.removeItem('userData');
          delete api.defaults.headers.common.Authorization;
          router.replace('/login');
        },
      },
    ]);
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
      
      <View style={[styles.header, { borderBottomColor: theme.slate200 }]}>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Settings</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: user?.avatar || 'https://via.placeholder.com/120' }} 
              style={[styles.avatar, { borderColor: theme.background }]} 
            />
            <TouchableOpacity 
              style={[styles.editBadge, { backgroundColor: theme.brandPrimary }]}
              onPress={handleEditProfile}
            >
              <Ionicons name="pencil" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: theme.slate900 }]}>{user?.fullName || user?.username || 'User'}</Text>
          <Text style={[styles.profileStatus, { color: theme.slate500 }]}>{user?.status || 'Available'}</Text>
          
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: theme.brandPrimary }]}
            onPress={handleEditProfile}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: theme.slate200 }]}
              onPress={handleOpenPhoneModal}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.brandPrimary + '1A' }]}>
                <Ionicons name="call" size={20} color={theme.brandPrimary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.slate900 }]}>Phone Number</Text>
                <Text style={[styles.settingSublabel, { color: theme.slate500 }]}>{user?.phoneNumber || 'Not set'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Alert.alert('Email Update', 'Email update is temporarily disabled.')}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.brandPrimary + '1A' }]}>
                <Ionicons name="mail" size={20} color={theme.brandPrimary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.slate900 }]}>Email</Text>
                <Text style={[styles.settingSublabel, { color: theme.slate500 }]}>{user?.email || 'Not set'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: theme.slate200 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/notifications' as any);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FF6B001A' }]}>
                <Ionicons name="notifications" size={20} color="#FF6B00" />
              </View>
              <Text style={[styles.settingLabelFlat, { color: theme.slate900 }]}>Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: theme.slate200 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/privacy_security' as any);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: '#10b9811A' }]}>
                <Ionicons name="lock-closed" size={20} color="#10b981" />
              </View>
              <Text style={[styles.settingLabelFlat, { color: theme.slate900 }]}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={[styles.iconBox, { backgroundColor: '#f59e0b1A' }]}>
                <Ionicons name="help-circle" size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.settingLabelFlat, { color: theme.slate900 }]}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.background, borderColor: theme.slate200 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: theme.slate400 }]}>Version 4.12.0 (Build 223)</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isPhoneModalVisible}
        onRequestClose={() => setIsPhoneModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}> 
            <Text style={[styles.modalTitle, { color: theme.slate900 }]}>Update Phone Number</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.slate900, borderColor: theme.slate200 }]}
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder="Enter phone number"
              placeholderTextColor={theme.slate400}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.slate200 }]}
                onPress={() => setIsPhoneModalVisible(false)}
                disabled={savingPhone}
              >
                <Text style={[styles.modalButtonText, { color: theme.slate900 }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.brandPrimary }]}
                onPress={handleSavePhone}
                disabled={savingPhone}
              >
                {savingPhone ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 120, // Space for floating tab bar
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingLabelFlat: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  settingSublabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 17,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    minWidth: 92,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
