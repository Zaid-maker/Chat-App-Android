import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, SafeAreaView, Switch, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [settings, setSettings] = useState({
    messages: true,
    calls: true,
    alerts: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filters = ['All', 'Messages', 'Calls', 'Requests'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.slate900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Notifications</Text>
        <TouchableOpacity>
          <Text style={[styles.clearAll, { color: theme.brandPrimary }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => {
                setActiveFilter(filter);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.filterPill,
                { backgroundColor: activeFilter === filter ? theme.brandPrimary : theme.slate200 + '80' }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === filter ? '#FFF' : theme.slate900 }
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>RECENT</Text>
          
          {/* Notification Item 1 */}
          <View style={styles.notificationItem}>
            <View style={styles.avatarWrapper}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6385iPA5wb6Qu1xtxDAFhXJ9hOvumfO-UfBCpC4HxFeVELcOmjFANQgir1kBUMgaKdd3RrMLV1D0aAPSwA7FsX3q6ymJX1bYbCUy3wDsZPlsvAmJhO6ts9Iv7uM8xnoyf6UiZTRUfNdTih7W7l0_oYBGNNxYoZTGi4ofd7M8mMA5ZFBiwbpFpkku9bwQyYQalAexUgP4DZ4zrxix0mQH1xQJ6da3inBmcg3DHzz-nJ6FO3SiLSULi2jc6AJ89jcrYeEM2avAGnczL' }} 
                style={styles.avatar} 
              />
              <View style={[styles.onlineDot, { borderColor: theme.brandBackground }]} />
            </View>
            <View style={styles.notifInfo}>
              <View style={styles.notifHeader}>
                <Text style={[styles.notifTitle, { color: theme.slate900 }]} numberOfLines={1}>
                  New message from Alex
                </Text>
                <Text style={[styles.notifTime, { color: theme.slate400 }]}>2m ago</Text>
              </View>
              <Text style={[styles.notifText, { color: theme.slate500 }]} numberOfLines={1}>
                "Hey, are we still meeting at 5?"
              </Text>
            </View>
            <View style={[styles.unreadDot, { backgroundColor: theme.brandPrimary }]} />
          </View>

          {/* Notification Item 2 */}
          <View style={styles.notificationItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#ef44441A' }]}>
              <Ionicons name="call-outline" size={24} color="#ef4444" />
              <View style={styles.missedCallOverlay}>
                <Ionicons name="close" size={12} color="#ef4444" />
              </View>
            </View>
            <View style={styles.notifInfo}>
              <View style={styles.notifHeader}>
                <Text style={[styles.notifTitle, { color: theme.slate900 }]} numberOfLines={1}>
                  Missed call from Jordan
                </Text>
                <Text style={[styles.notifTime, { color: theme.slate400 }]}>15m ago</Text>
              </View>
              <Text style={[styles.notifText, { color: theme.slate500 }]} numberOfLines={1}>
                Voice call • Tap to callback
              </Text>
            </View>
          </View>

          {/* Friend Request Card */}
          <View style={[
            styles.requestCard, 
            { 
              backgroundColor: colorScheme === 'dark' ? theme.slate200 + '1A' : '#FDF5F2', 
              borderColor: colorScheme === 'dark' ? theme.slate200 + '33' : '#FEE5D9' 
            }
          ]}>
            <View style={styles.requestHeader}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxKuHd0zXvV7p542tLVVq0lRY8EmJ_lSJCiQPYOsW9q3R4-5MWHtqsfwHNImTz8GPeBL2_DZSVz37NQEk-YfS7VGqLc63fOSvp5U8bfgoE1x5mRrAidEGQEpiomFJ4R6xHWyFt9vdWHr7kg3TALPITCQElzW171TaAQwZ1JRFepc8IAXS5rpbRpuzZqqmrd91VBsCFY1mMeaS37wT0AMo2C2Rb3uWmA6y2rlJ9iNLDm-UJob_Zq3pl8rUcxsh9pIwDkBcgPihVim9v' }} 
                style={styles.requestAvatar} 
              />
              <View style={styles.requestInfo}>
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, { color: theme.slate900 }]}>Friend request from Sarah</Text>
                  <Text style={[styles.notifTime, { color: theme.slate400 }]}>1h ago</Text>
                </View>
                <Text style={[styles.notifText, { color: theme.slate500 }]}>Mutual friends: 12</Text>
              </View>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.brandPrimary }]}>
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.slate200 }]}>
                <Text style={[styles.actionButtonText, { color: theme.slate900 }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.background }]}>
            {/* Setting Item 1 */}
            <View style={[styles.settingRow, { borderBottomColor: theme.slate200 }]}>
              <View style={styles.settingLabelGroup}>
                <View style={[styles.settingIcon, { backgroundColor: colorScheme === 'dark' ? theme.slate200 + '1A' : '#FDF5F2' }]}>
                  <Ionicons name="chatbubble" size={20} color={theme.brandPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: theme.slate900 }]}>Message Notifications</Text>
              </View>
              <Switch 
                value={settings.messages} 
                onValueChange={() => toggleSetting('messages')}
                trackColor={{ false: theme.slate200, true: theme.brandPrimary }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : (settings.messages ? '#FFF' : '#f4f3f4')}
              />
            </View>

            {/* Setting Item 2 */}
            <View style={[styles.settingRow, { borderBottomColor: theme.slate200 }]}>
              <View style={styles.settingLabelGroup}>
                <View style={[styles.settingIcon, { backgroundColor: colorScheme === 'dark' ? theme.slate200 + '1A' : '#FDF5F2' }]}>
                  <Ionicons name="call" size={20} color={theme.brandPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: theme.slate900 }]}>Call Notifications</Text>
              </View>
              <Switch 
                value={settings.calls} 
                onValueChange={() => toggleSetting('calls')}
                trackColor={{ false: theme.slate200, true: theme.brandPrimary }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : (settings.calls ? '#FFF' : '#f4f3f4')}
              />
            </View>

            {/* Setting Item 3 */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <View style={[styles.settingIcon, { backgroundColor: colorScheme === 'dark' ? theme.slate200 + '1A' : '#FDF5F2' }]}>
                  <Ionicons name="person-add" size={20} color={theme.brandPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: theme.slate900 }]}>New Friend Alerts</Text>
              </View>
              <Switch 
                value={settings.alerts} 
                onValueChange={() => toggleSetting('alerts')}
                trackColor={{ false: theme.slate200, true: theme.brandPrimary }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : (settings.alerts ? '#FFF' : '#f4f3f4')}
              />
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    padding: 5,
  },
  clearAll: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  filtersContainer: {
    marginVertical: 10,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  missedCallOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  notifInfo: {
    flex: 1,
    marginLeft: 15,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  notifTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notifText: {
    fontSize: 14,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  requestCard: {
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 15,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  settingsCard: {
    borderRadius: 16,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
