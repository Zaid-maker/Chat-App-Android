import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Switch, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [settings, setSettings] = useState({
    securityNotifications: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderItem = (icon: string, title: string, sublabel: string, rightElement?: React.ReactNode, isLast: boolean = false) => (
    <TouchableOpacity 
      style={[styles.itemRow, !isLast && { borderBottomColor: theme.slate200, borderBottomWidth: 1 }]}
      disabled={!rightElement || React.isValidElement(rightElement) && rightElement.type === Switch}
    >
      <View style={[styles.iconContainer, { backgroundColor: colorScheme === 'dark' ? theme.slate200 + '1A' : '#FDF5F2' }]}>
        <Ionicons name={icon as any} size={22} color={theme.brandPrimary} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTitle, { color: theme.slate900 }]}>{title}</Text>
        <Text style={[styles.itemSublabel, { color: theme.slate500 }]}>{sublabel}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={theme.slate400} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.slate900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PRIVACY SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>PRIVACY</Text>
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {renderItem('person-outline', 'Profile Visibility', 'Who can see your photo', 
              <View style={styles.rightInfo}>
                <Text style={[styles.rightText, { color: theme.brandPrimary }]}>Everyone</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
              </View>
            )}
            {renderItem('time-outline', 'Last Seen', 'App usage status', 
              <View style={styles.rightInfo}>
                <Text style={[styles.rightText, { color: theme.brandPrimary }]}>My Contacts</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
              </View>
            )}
            {renderItem('radio-button-on-outline', 'Status', 'Stories and updates', 
              <View style={styles.rightInfo}>
                <Text style={[styles.rightText, { color: theme.brandPrimary }]}>Everyone</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
              </View>, 
              true
            )}
          </View>
        </View>

        {/* SECURITY SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>SECURITY</Text>
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {renderItem('shield-checkmark-outline', 'Two-Step Verification', 'Extra layer of protection',
              <View style={styles.rightInfo}>
                <Text style={[styles.rightText, { color: theme.slate400 }]}>On</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
              </View>
            )}
            {renderItem('notifications-outline', 'Security Notifications', 'Alerts on login attempts',
              <Switch 
                value={settings.securityNotifications} 
                onValueChange={() => toggleSetting('securityNotifications')}
                trackColor={{ false: theme.slate200, true: theme.brandPrimary }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : (settings.securityNotifications ? '#FFF' : '#f4f3f4')}
              />,
              true
            )}
          </View>
        </View>

        {/* BLOCKED SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>BLOCKED</Text>
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {renderItem('remove-circle-outline', 'Blocked Contacts', '12 people blocked', null, true)}
          </View>
        </View>

        {/* Footer Memo */}
        <View style={styles.footerMemo}>
          <Text style={[styles.footerMemoText, { color: theme.slate400 }]}>
            Protecting your privacy is our priority. Your messages are end-to-end encrypted and cannot be read by anyone else.
          </Text>
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
  scrollContent: {
    paddingBottom: 40,
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
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerMemo: {
    marginTop: 40,
    paddingHorizontal: 40,
  },
  footerMemoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
