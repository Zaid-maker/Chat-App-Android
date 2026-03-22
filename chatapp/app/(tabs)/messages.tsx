import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, SafeAreaView, Platform, StatusBar as RNStatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api, { SOCKET_URL } from '@/constants/api';
import storage from '@/constants/storage';
import { io } from 'socket.io-client';

export default function MessagesScreen() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState<Record<string, boolean>>({});
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const fetchChats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = await storage.getItem('userToken');
      const userData = await storage.getItem('userData');
      if (userData) setCurrentUser(JSON.parse(userData));

      const response = await api.get('/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    const getInitialData = async () => {
        const token = await storage.getItem('userToken');
        if (!token) {
            router.replace('/login');
            return;
        }
        
        // Add token to api header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchChats();
    };
    
    getInitialData();
  }, [fetchChats]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('join', currentUser._id);
    });

    socket.on('message received', (message) => {
      const participants = message?.chat?.participants || [];
      const isMyChat = participants.some((participant: any) => participant?._id === currentUser._id);
      if (isMyChat) {
        fetchChats(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id, fetchChats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats(false);
  };

  const getChatName = (chat: any) => {
    if (chat.isGroup) return chat.groupName;
    const otherParticipant = chat.participants.find((p: any) => p._id !== currentUser?._id);
    return otherParticipant?.username || 'Unknown User';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.isGroup) return '';
    const otherParticipant = chat.participants.find((p: any) => p._id !== currentUser?._id);
    return otherParticipant?.avatar || '';
  };

  const getOtherParticipant = (chat: any) => {
    if (chat.isGroup) return null;
    return chat.participants.find((p: any) => p._id !== currentUser?._id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatItem = ({ item }: { item: any }) => {
    const otherParticipant = getOtherParticipant(item);
    const avatarUri = getChatAvatar(item);
    const avatarKey = `chat-${item._id}`;
    const shouldFallbackAvatar = !avatarUri || avatarLoadFailed[avatarKey];
    const displayName = getChatName(item);
    const isOnline = Boolean(otherParticipant?.isOnline);

    return (
      <TouchableOpacity 
        style={[styles.chatItem, { borderBottomColor: theme.slate200 }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${item._id}`)}
      >
        <View style={styles.avatarContainer}>
          {shouldFallbackAvatar ? (
            <View style={[styles.avatarFallback, { backgroundColor: theme.slate200 }]}> 
              <Text style={[styles.avatarFallbackText, { color: theme.slate500 }]}>{getInitials(displayName)}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              onError={() =>
                setAvatarLoadFailed((prev) => ({
                  ...prev,
                  [avatarKey]: true,
                }))
              }
            />
          )}
          {otherParticipant ? (
            <View
              style={[
                styles.onlineIndicator,
                {
                  borderColor: theme.background,
                  backgroundColor: isOnline ? '#10b981' : theme.slate400,
                },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.name, { color: theme.slate900 }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.time, { color: theme.slate400 }]}> 
              {formatTime(item.updatedAt)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.message, { color: theme.slate500 }]} numberOfLines={1}>
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {/* Unread badge logic would go here */}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Messages</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.slate200 + '33' }]}>
            <Ionicons name="search" size={20} color={theme.slate900} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.slate200 + '33' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications' as any);
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.slate900} />
            <View style={[styles.notifBadge, { backgroundColor: '#FF6B00' }]} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.slate400 }]}>No conversations yet</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.brandPrimary }]}
        activeOpacity={0.8}
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/new-chat' as any);
        }}
      >
        <Ionicons name="add" size={32} color="#FFF" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
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
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  listContent: {
    paddingBottom: 120,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

