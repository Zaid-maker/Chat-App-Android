import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

export default function NewChatScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [createChatError, setCreateChatError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setContactsError(null);
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
      console.error('Error fetching contacts for new chat:', error);
      setContactsError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact._id === selectedUserId) || null,
    [contacts, selectedUserId]
  );

  const onCreateChat = useCallback(async () => {
    if (!selectedContact || creating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCreating(true);
    setCreateChatError(null);

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.post(
        '/chats',
        { userId: selectedContact._id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      router.replace(`/chat/${response.data._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      setCreateChatError('Failed to start chat. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [selectedContact, creating, router]);

  const onPressNewGroup = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming soon', 'New Group will be available in a future update.');
  }, []);

  const onPressNewContact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming soon', 'New Contact will be available in a future update.');
  }, []);

  const renderContact = ({ item }: { item: Contact }) => {
    const selected = item._id === selectedUserId;

    return (
      <TouchableOpacity
        style={[
          styles.contactRow,
          {
            backgroundColor: selected ? `${theme.brandPrimary}14` : 'transparent',
            borderColor: selected ? `${theme.brandPrimary}55` : 'transparent',
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedUserId((prev) => (prev === item._id ? null : item._id));
        }}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          <Image source={{ uri: item.avatar || 'https://via.placeholder.com/96' }} style={styles.avatar} />
          <View
            style={[
              styles.presenceDot,
              {
                backgroundColor: item.isOnline ? '#22c55e' : theme.slate400,
                borderColor: theme.brandBackground,
              },
            ]}
          />
        </View>

        <View style={styles.contactBody}>
          <Text style={[styles.contactName, { color: theme.slate900 }]} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={[styles.contactStatus, { color: theme.slate500 }]} numberOfLines={1}>
            {item.status || item.email || 'No status'}
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? theme.brandPrimary : theme.slate400,
              backgroundColor: selected ? theme.brandPrimary : 'transparent',
            },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.topIconButton, { backgroundColor: `${theme.slate200}55` }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.slate900} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>New Chat</Text>

        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: selectedContact ? theme.brandPrimary : `${theme.slate400}66`,
            },
          ]}
          onPress={onCreateChat}
          disabled={!selectedContact || creating}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: `${theme.slate200}66` }]}>
          <Ionicons name="search" size={18} color={theme.slate400} />
          <TextInput
            style={[styles.searchInput, { color: theme.slate900 }]}
            placeholder="Search contacts..."
            placeholderTextColor={theme.slate400}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: `${theme.brandPrimary}14` }]}
          activeOpacity={0.85}
          onPress={onPressNewGroup}
          accessibilityRole="button"
          accessibilityLabel="Create a new group"
        >
          <View style={[styles.quickIcon, { backgroundColor: `${theme.brandPrimary}28` }]}>
            <Ionicons name="people" size={20} color={theme.brandPrimary} />
          </View>
          <View style={styles.quickTextWrap}>
            <Text style={[styles.quickTitle, { color: theme.slate900 }]}>New Group</Text>
            <Text style={[styles.quickSub, { color: theme.slate500 }]}>Chat with multiple people</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: `${theme.brandPrimary}14` }]}
          activeOpacity={0.85}
          onPress={onPressNewContact}
          accessibilityRole="button"
          accessibilityLabel="Create a new contact"
        >
          <View style={[styles.quickIcon, { backgroundColor: `${theme.brandPrimary}28` }]}>
            <Ionicons name="person-add" size={20} color={theme.brandPrimary} />
          </View>
          <View style={styles.quickTextWrap}>
            <Text style={[styles.quickTitle, { color: theme.slate900 }]}>New Contact</Text>
            <Text style={[styles.quickSub, { color: theme.slate500 }]}>Add a person by phone or ID</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.slate400} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.contactsHeader, { color: theme.slate400 }]}>CONTACTS</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.brandPrimary} />
        </View>
      ) : (
        <>
          {createChatError ? (
            <View style={[styles.errorBanner, { borderColor: '#fca5a5', backgroundColor: '#fee2e2' }]}>
              <Text style={styles.errorBannerText}>{createChatError}</Text>
            </View>
          ) : null}

          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              contactsError ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: theme.slate500 }]}>{contactsError}</Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.brandPrimary }]}
                    onPress={fetchContacts}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading contacts"
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: theme.slate500 }]}>No contacts found</Text>
                </View>
              )
            }
          />
        </>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  createButton: {
    minWidth: 84,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  quickCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  quickSub: {
    fontSize: 12,
    marginTop: 2,
  },
  contactsHeader: {
    marginTop: 14,
    paddingHorizontal: 20,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  presenceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  contactBody: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
  },
  contactStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBannerText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
});
