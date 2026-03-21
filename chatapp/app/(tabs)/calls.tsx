import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, SafeAreaView, Platform, StatusBar as RNStatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { io, Socket } from 'socket.io-client';
import api, { SOCKET_URL } from '@/constants/api';
import storage from '@/constants/storage';

type CallItem = {
  _id: string;
  contact: {
    _id: string;
    username: string;
    avatar?: string;
  };
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'rejected';
  type: 'voice' | 'video';
  createdAt: string;
};

export default function CallsScreen() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveCallStatus, setLiveCallStatus] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const fetchCalls = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.get('/calls', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCalls(response.data || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    let isMounted = true;
    let callSocket: Socket | null = null;

    const setupSocket = async () => {
      const userData = await storage.getItem('userData');
      if (!userData) return;

      let currentUserId: string | null = null;
      try {
        const parsed = JSON.parse(userData);
        currentUserId = parsed?._id || null;
      } catch (error) {
        console.error('Failed to parse userData for call socket:', error);
        return;
      }

      if (!currentUserId) return;

      callSocket = io(SOCKET_URL, { transports: ['websocket'] });

      callSocket.on('connect', () => {
        callSocket?.emit('join', currentUserId);
      });

      callSocket.on('call:incoming', () => {
        if (!isMounted) return;
        setLiveCallStatus('Incoming call...');
        fetchCalls(false);
      });

      callSocket.on('call:accepted', () => {
        if (!isMounted) return;
        setLiveCallStatus('Call accepted');
        fetchCalls(false);
      });

      callSocket.on('call:ended', () => {
        if (!isMounted) return;
        setLiveCallStatus('Call ended');
        fetchCalls(false);
      });
    };

    setupSocket();

    return () => {
      isMounted = false;
      callSocket?.disconnect();
    };
  }, [fetchCalls]);

  useEffect(() => {
    if (!liveCallStatus) return;
    const timer = setTimeout(() => setLiveCallStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [liveCallStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCalls(false);
  };

  const formatCallTime = (isoDate: string) => {
    const callDate = new Date(isoDate);
    const today = new Date();

    if (callDate.toDateString() === today.toDateString()) {
      return callDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return callDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusLabel = (call: CallItem) => {
    if (call.status === 'missed') return 'Missed';
    return call.direction === 'incoming' ? 'Incoming' : 'Outgoing';
  };

  const getStatusIcon = (call: CallItem) => {
    const label = getStatusLabel(call);
    switch (label) {
      case 'Missed':
        return <Ionicons name="call-outline" size={14} color="#ef4444" />;
      case 'Incoming':
        return <Ionicons name="arrow-down-outline" size={14} color="#10b981" />;
      case 'Outgoing':
        return <Ionicons name="arrow-up-outline" size={14} color={theme.brandPrimary} />;
      default:
        return null;
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const label = getStatusLabel(call);
      if (activeTab === 'Missed' && label !== 'Missed') return false;
      return call.contact.username.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [calls, activeTab, searchQuery]);

  const handleRedial = async (call: CallItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await api.post(
        '/calls',
        {
          receiverId: call.contact._id,
          type: call.type,
          status: 'completed',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userData = await storage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          const socket = io(SOCKET_URL, { transports: ['websocket'] });
          socket.on('connect', () => {
            socket.emit('join', parsed?._id);
            socket.emit('call:initiate', {
              toUserId: call.contact._id,
              callId: response.data?._id,
              type: call.type,
            });
            socket.disconnect();
          });
        } catch (error) {
          console.error('Failed to emit call:initiate:', error);
        }
      }

      fetchCalls(false);
    } catch (error) {
      console.error('Error creating call:', error);
    }
  };

  const renderCallItem = ({ item }: { item: CallItem }) => (
    <TouchableOpacity
      style={[styles.callItem, { borderBottomColor: theme.slate200 }]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.contact.avatar || 'https://via.placeholder.com/56' }} style={styles.avatar} />
      </View>
      <View style={styles.callDetails}>
        <Text style={[styles.name, { color: theme.slate900 }]}>{item.contact.username}</Text>
        <View style={styles.statusRow}>
          {getStatusIcon(item)}
          <Text style={[styles.statusText, { color: getStatusLabel(item) === 'Missed' ? '#ef4444' : theme.slate500 }]}> 
            {getStatusLabel(item)} • {formatCallTime(item.createdAt)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.callAction, { backgroundColor: theme.brandPrimary + '1A' }]}
        onPress={() => handleRedial(item)}
      >
        <Ionicons
          name={item.type === 'video' ? 'videocam' : 'call'}
          size={20}
          color={theme.brandPrimary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Calls</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.slate200 + '33' }]}>
              <Ionicons name="search" size={20} color={theme.slate900} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.slate200 + '33' }]}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.slate900} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {['All', 'Missed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: theme.brandPrimary }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? theme.brandPrimary : theme.slate500 }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.slate200 + '33' }]}>
          <Ionicons name="search" size={20} color={theme.slate400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.slate900 }]}
            placeholder="Search contacts or history"
            placeholderTextColor={theme.slate400}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>
      </View>

      {liveCallStatus ? (
        <View style={[styles.liveStatusBanner, { backgroundColor: theme.brandPrimary + '1A', borderColor: theme.brandPrimary + '55' }]}> 
          <Ionicons name="radio" size={14} color={theme.brandPrimary} />
          <Text style={[styles.liveStatusText, { color: theme.brandPrimary }]}>{liveCallStatus}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderCallItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="call-outline" size={64} color={theme.slate200} />
              <Text style={[styles.emptyText, { color: theme.slate400 }]}>No call history found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.brandPrimary }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/dialer');
        }}
      >
        <Ionicons name="keypad" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 120,
  },
  liveStatusBanner: {
    marginHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  callDetails: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  callAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
});
