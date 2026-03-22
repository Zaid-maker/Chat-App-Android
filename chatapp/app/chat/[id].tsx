import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import api, { SOCKET_URL } from '@/constants/api';
import storage from '@/constants/storage';
import { io } from 'socket.io-client';

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams(); // This is the chatId
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const setup = async () => {
      const userData = await storage.getItem('userData');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);

        // Socket.io setup: join user room so server can deliver direct message events.
        console.log('🔌 SOCKET: Attempting to connect to:', SOCKET_URL);
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
          if (parsedUser?._id) {
            newSocket.emit('join', parsedUser._id);
          }
        });

        newSocket.on('message received', (newMessage) => {
          if (String(newMessage?.chat?._id) === String(id)) {
            setMessages((prev) => {
              if (!newMessage?._id) return prev;
              if (prev.some((message) => message?._id === newMessage._id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('SOCKET connect_error in chat room:', error.message);
        });
      }

      // Fetch messages
      try {
        const response = await api.get(`/chats/messages/${id}`);
        setMessages(response.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    setup();

    return () => {
      setSocket((prevSocket: any) => {
        prevSocket?.disconnect();
        return null;
      });
    };
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (inputText.trim()) {
      const content = inputText.trim();
      setInputText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const response = await api.post('/chats/messages', {
          content,
          chatId: id,
        });

        const newMessage = response.data;
        setMessages((prev) => [...prev, newMessage]);

        if (socket) {
          socket.emit('new message', newMessage);
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  };

  const getOtherParticipant = () => {
    if (!chatInfo || !currentUser) return null;
    return chatInfo.participants.find((p: any) => p._id !== currentUser._id);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender._id === currentUser?._id;
    return (
      <View style={[
        styles.messageRow,
        isUser ? styles.userMessageRow : styles.friendMessageRow
      ]}>
        {!isUser && (
          <Image source={{ uri: item.sender.avatar || 'https://via.placeholder.com/28' }} style={styles.messageAvatar} />
        )}
        <View style={[
          styles.bubble,
          isUser ?
            [styles.userBubble, { backgroundColor: theme.userBubble }] :
            [styles.friendBubble, { backgroundColor: theme.friendBubble }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isUser ? '#FFF' : theme.slate900 }
          ]}>{item.content}</Text>
          <Text style={[
            styles.messageTime,
            { color: isUser ? 'rgba(255,255,255,0.7)' : theme.slate500 }
          ]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.brandBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.slate200 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/messages')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color={theme.brandPrimary} />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: 'https://via.placeholder.com/40' }}
                style={styles.headerAvatar}
              />
              <View style={[styles.activeIndicator, { borderColor: theme.background }]} />
            </View>
            <View>
              <Text style={[styles.headerName, { color: theme.slate900 }]}>Chat</Text>
              <Text style={[styles.headerStatus, { color: theme.slate500 }]}>Online</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="videocam-outline" size={24} color={theme.brandPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="call-outline" size={22} color={theme.brandPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.brandPrimary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View style={styles.dateDivider}>
                <Text style={[styles.dateText, { color: theme.slate400 }]}>TODAY</Text>
              </View>
            )}
          />
        )}

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 12)
          }
        ]}>
          <View style={[styles.inputPill, { backgroundColor: theme.slate200 + '33', borderColor: theme.slate200 }]}>
            <TouchableOpacity style={styles.inputIconButton}>
              <Ionicons name="add" size={24} color={theme.slate400} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: theme.slate900 }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.slate400}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
              }}
              multiline
            />

            <TouchableOpacity style={styles.inputIconButton}>
              <Ionicons name="happy-outline" size={22} color={theme.slate400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.brandPrimary }]}
              onPress={handleSend}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    padding: 4,
  },
  messageList: {
    paddingHorizontal: 0,
    paddingVertical: 20,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  friendMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '86%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  friendBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
  },
  inputIconButton: {
    padding: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

