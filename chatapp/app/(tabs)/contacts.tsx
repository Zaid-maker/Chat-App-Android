import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as ExpoContacts from 'expo-contacts';
import api from '@/constants/api';
import storage from '@/constants/storage';

type Contact = {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  status?: string;
  isOnline?: boolean;
};

type DeviceContactMatch = {
  id: string;
  name: string;
  email: string;
  matchedUser: Contact;
  matchedBy: 'email' | 'name';
};

type ContactsSection = {
  key: 'appUsers' | 'phoneMatches';
  title: string;
  data: Array<Contact | DeviceContactMatch>;
};

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState<Record<string, boolean>>({});

  const [contactsPermission, setContactsPermission] = useState<ExpoContacts.PermissionStatus | null>(null);
  const [deviceContactsCount, setDeviceContactsCount] = useState(0);
  const [deviceContacts, setDeviceContacts] = useState<ExpoContacts.Contact[]>([]);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const fetchContacts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.get('/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setContacts(response.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const requestDeviceContactsPermission = useCallback(async () => {
    try {
      const permission = await ExpoContacts.requestPermissionsAsync();
      setContactsPermission(permission.status);

      if (permission.status !== 'granted') {
        setDeviceContactsCount(0);
        setDeviceContacts([]);
        return;
      }

      const result = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.Emails],
      });

      setDeviceContacts(result.data || []);
      setDeviceContactsCount((result.data || []).length);
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  }, []);

  useEffect(() => {
    requestDeviceContactsPermission();
  }, [requestDeviceContactsPermission]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter((contact) => {
      return (
        contact.username?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term)
      );
    });
  }, [contacts, search]);

  const matchedDeviceContacts = useMemo(() => {
    const appUsersByEmail = new Map<string, Contact>();
    const appUsersByName = new Map<string, Contact>();

    const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

    contacts.forEach((user) => {
      if (user.email) appUsersByEmail.set(user.email.trim().toLowerCase(), user);
      if (user.username) appUsersByName.set(normalizeName(user.username), user);
    });

    const matches: DeviceContactMatch[] = [];
    const seen = new Set<string>();

    deviceContacts.forEach((deviceContact, index) => {
      const entries = deviceContact.emails || [];
      let matchedByEmail = false;

      for (const entry of entries) {
        const normalizedEmail = (entry.email || '').trim().toLowerCase();
        if (!normalizedEmail) continue;

        const matchedUser = appUsersByEmail.get(normalizedEmail);
        if (!matchedUser) continue;

        const deviceContactId = String((deviceContact as { id?: string }).id || index);
        const dedupeKey = `${deviceContactId}:${matchedUser._id}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        matches.push({
          id: deviceContactId,
          name: deviceContact.name || matchedUser.username,
          email: normalizedEmail,
          matchedUser,
          matchedBy: 'email',
        });

        matchedByEmail = true;
      }

      if (matchedByEmail) return;

      const normalizedDeviceName = normalizeName(deviceContact.name || '');
      if (!normalizedDeviceName) return;

      const matchedUserByName = appUsersByName.get(normalizedDeviceName);
      if (!matchedUserByName) return;

      const deviceContactId = String((deviceContact as { id?: string }).id || index);
      const dedupeKey = `${deviceContactId}:${matchedUserByName._id}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      matches.push({
        id: deviceContactId,
        name: deviceContact.name || matchedUserByName.username,
        email: '',
        matchedUser: matchedUserByName,
        matchedBy: 'name',
      });
    });

    const term = search.trim().toLowerCase();
    if (!term) return matches;

    return matches.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.matchedUser.username.toLowerCase().includes(term)
      );
    });
  }, [contacts, deviceContacts, search]);

  const matchStats = useMemo(() => {
    const byEmail = matchedDeviceContacts.filter((item) => item.matchedBy === 'email').length;
    const byName = matchedDeviceContacts.filter((item) => item.matchedBy === 'name').length;
    return { byEmail, byName };
  }, [matchedDeviceContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(false);
    requestDeviceContactsPermission();
  };

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  }, []);

  const openOrCreateChat = async (contact: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpeningChatFor(contact._id);

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.post(
        '/chats',
        { userId: contact._id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      router.push(`/chat/${response.data._id}`);
    } catch (error) {
      console.error('Error opening chat:', error);
    } finally {
      setOpeningChatFor(null);
    }
  };

  const sections: ContactsSection[] = [
    { key: 'appUsers' as const, title: 'APP USERS', data: filteredContacts },
    { key: 'phoneMatches' as const, title: 'FROM PHONE CONTACTS ON CHATAPP', data: matchedDeviceContacts },
  ].filter((section) => section.data.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Contacts</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.brandPrimary }]}>
          <Ionicons name="person-add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.slate200 + '4D' }]}>
          <Ionicons name="search" size={20} color={theme.slate400} />
          <TextInput
            placeholder="Search friends..."
            placeholderTextColor={theme.slate400}
            style={[styles.searchInput, { color: theme.slate900 }]}
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>
      </View>

      <View style={styles.permissionContainer}>
        <View style={[styles.permissionCard, { backgroundColor: theme.slate200 + '40' }]}>
          <View style={styles.permissionTextWrap}>
            <Text style={[styles.permissionTitle, { color: theme.slate900 }]}>Device contacts access</Text>
            <Text style={[styles.permissionSubtitle, { color: theme.slate500 }]}> 
              {contactsPermission === 'granted'
                ? `Allowed. ${deviceContactsCount} contacts available. Matched: ${matchedDeviceContacts.length} (email: ${matchStats.byEmail}, name: ${matchStats.byName}).`
                : 'Allow access so the app can read all contacts and match existing users.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.brandPrimary }]}
            onPress={requestDeviceContactsPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>
              {contactsPermission === 'granted' ? 'Refresh' : 'Allow'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.brandPrimary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.slate400 }]}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.key === 'phoneMatches') {
              const matched = item as DeviceContactMatch;
              const avatarKey = `phone-${matched.matchedUser._id}`;
              const shouldFallbackAvatar = !matched.matchedUser.avatar || avatarLoadFailed[avatarKey];

              return (
                <TouchableOpacity
                  style={[styles.contactItem, { borderBottomColor: theme.slate200 }]}
                  activeOpacity={0.7}
                  onPress={() => openOrCreateChat(matched.matchedUser)}
                >
                  <View style={styles.avatarContainer}>
                    {shouldFallbackAvatar ? (
                      <View style={[styles.avatarFallback, { backgroundColor: theme.slate200 }]}> 
                        <Text style={[styles.avatarFallbackText, { color: theme.slate500 }]}>{getInitials(matched.name)}</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: matched.matchedUser.avatar }}
                        style={styles.avatar}
                        onError={() =>
                          setAvatarLoadFailed((prev) => ({
                            ...prev,
                            [avatarKey]: true,
                          }))
                        }
                      />
                    )}
                    {matched.matchedUser.isOnline ? (
                      <View style={[styles.onlineIndicator, { borderColor: theme.background }]} />
                    ) : null}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.name, { color: theme.slate900 }]}>{matched.name}</Text>
                    <Text style={[styles.status, { color: theme.slate500 }]}>On ChatApp as {matched.matchedUser.username}</Text>
                  </View>
                  {openingChatFor === matched.matchedUser._id ? (
                    <ActivityIndicator size="small" color={theme.brandPrimary} />
                  ) : null}
                </TouchableOpacity>
              );
            }

            const contact = item as Contact;
            const avatarKey = `app-${contact._id}`;
            const shouldFallbackAvatar = !contact.avatar || avatarLoadFailed[avatarKey];

            return (
              <TouchableOpacity
                style={[styles.contactItem, { borderBottomColor: theme.slate200 }]}
                activeOpacity={0.7}
                onPress={() => openOrCreateChat(contact)}
              >
                <View style={styles.avatarContainer}>
                  {shouldFallbackAvatar ? (
                    <View style={[styles.avatarFallback, { backgroundColor: theme.slate200 }]}> 
                      <Text style={[styles.avatarFallbackText, { color: theme.slate500 }]}>{getInitials(contact.username)}</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: contact.avatar }}
                      style={styles.avatar}
                      onError={() =>
                        setAvatarLoadFailed((prev) => ({
                          ...prev,
                          [avatarKey]: true,
                        }))
                      }
                    />
                  )}
                  {contact.isOnline && <View style={[styles.onlineIndicator, { borderColor: theme.background }]} />}
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.name, { color: theme.slate900 }]}>{contact.username}</Text>
                  <Text style={[styles.status, { color: theme.slate500 }]}>{contact.status || contact.email}</Text>
                </View>
                {openingChatFor === contact._id ? (
                  <ActivityIndicator size="small" color={theme.brandPrimary} />
                ) : null}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item, index) => {
            if ('matchedUser' in (item as any)) {
              const matched = item as DeviceContactMatch;
              return `${matched.id}-${matched.matchedUser._id}-${index}`;
            }
            return (item as Contact)._id;
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.slate500 }]}>No contacts found</Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  permissionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  permissionCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  permissionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  permissionButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  listContent: {
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
  },
});
