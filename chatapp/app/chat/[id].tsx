import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar as RNStatusBar, ActivityIndicator, Keyboard, Pressable } from 'react-native';
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
import EmojiPicker from 'rn-emoji-keyboard';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams(); // This is the chatId
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerForMessageId, setReactionPickerForMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [usersTyping, setUsersTyping] = useState<Record<string, string>>({}); // userId -> userName

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

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

        newSocket.on('message reaction received', (updatedMessage) => {
          if (!updatedMessage?._id) return;

          setMessages((prev) =>
            prev.map((message) =>
              message._id === updatedMessage._id
                ? { ...message, reactions: updatedMessage.reactions || [] }
                : message
            )
          );
        });

        newSocket.on('user typing received', ({ chatId, userId, userName }) => {
          if (String(chatId) !== String(id)) return;
          setUsersTyping((prev) => ({
            ...prev,
            [userId]: userName,
          }));
        });

        newSocket.on('user stopped typing received', ({ chatId, userId }) => {
          if (String(chatId) !== String(id)) return;
          setUsersTyping((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        });

        newSocket.on('connect_error', (error) => {
          console.error('SOCKET connect_error in chat room:', error.message);
        });
      }

      // Fetch messages and chat info
      try {
        const messagesResponse = await api.get(`/chats/messages/${id}`);
        setMessages(messagesResponse.data);

        const chatResponse = await api.get(`/chats/${id}`);
        setChatInfo(chatResponse.data);
      } catch (err) {
        console.error('Error fetching messages or chat info:', err);
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

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!socket || !chatInfo || !currentUser) return;

    const participantIds = chatInfo.participants
      ?.map((p: any) => p._id)
      .filter((pid: string) => pid !== currentUser._id) || [];

    if (text.trim() && !isTypingRef.current) {
      // Start typing
      isTypingRef.current = true;
      socket.emit('user typing', {
        chatId: id,
        chatParticipants: participantIds,
        userName: currentUser.username,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to emit stopped typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('user stopped typing', {
        chatId: id,
        chatParticipants: participantIds,
      });
    }, 2000); // Stop typing after 2 seconds of no activity
  };

  const handleSend = async () => {
    if (inputText.trim()) {
      const content = inputText.trim();
      setInputText('');
      setShowEmojiPicker(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Clear typing state
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Emit stopped typing
      if (socket && chatInfo && currentUser) {
        const participantIds = chatInfo.participants
          ?.map((p: any) => p._id)
          .filter((pid: string) => pid !== currentUser._id) || [];

        socket.emit('user stopped typing', {
          chatId: id,
          chatParticipants: participantIds,
        });
      }

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

  const handleToggleEmojiPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setShowEmojiPicker((prev) => !prev);
  };

  const handlePickEmoji = (emojiObject: { emoji: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText((prev) => `${prev}${emojiObject.emoji}`);
    setShowEmojiPicker(false);
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const response = await api.patch(`/chats/messages/${messageId}/reactions`, { emoji });
      const updatedMessage = response.data;

      setMessages((prev) =>
        prev.map((message) =>
          message._id === updatedMessage._id
            ? { ...message, reactions: updatedMessage.reactions || [] }
            : message
        )
      );

      if (socket) {
        socket.emit('message reaction', updatedMessage);
      }
    } catch (error) {
      console.error('Error reacting to message:', error);
    } finally {
      setReactionPickerForMessageId(null);
    }
  };

  const renderReactions = (reactions: Array<{ emoji: string }> | undefined) => {
    if (!reactions || reactions.length === 0) return null;

    const grouped = reactions.reduce((acc: Record<string, number>, reaction) => {
      if (!reaction?.emoji) return acc;
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(grouped);
    if (entries.length === 0) return null;

    return (
      <View style={styles.reactionsRow}>
        {entries.map(([emoji, count]) => (
          <View key={emoji} style={[styles.reactionChip, { backgroundColor: theme.slate200 + '55' }]}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={[styles.reactionCount, { color: theme.slate500 }]}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const getOtherParticipant = () => {
    if (!chatInfo || !currentUser) return null;
    return chatInfo.participants.find((p: any) => p._id !== currentUser._id);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender._id === currentUser?._id;
    const showReactionPicker = reactionPickerForMessageId === item._id;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setReactionPickerForMessageId(item._id);
        }}
      >
      <View style={[
        styles.messageRow,
        isUser ? styles.userMessageRow : styles.friendMessageRow
      ]}>
        {!isUser && (
          <Image source={{ uri: item.sender.avatar || 'https://via.placeholder.com/28' }} style={styles.messageAvatar} />
        )}
        <View style={styles.messageContentWrap}>
          {showReactionPicker ? (
            <View style={[styles.reactionPickerRow, { backgroundColor: theme.background, borderColor: theme.slate200 }]}>
              {QUICK_REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={`${item._id}-${emoji}`}
                  style={styles.reactionPickerEmojiButton}
                  onPress={() => handleReactToMessage(item._id, emoji)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

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

          {renderReactions(item.reactions)}
        </View>
      </View>
      </TouchableOpacity>
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
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            if (reactionPickerForMessageId) {
              setReactionPickerForMessageId(null);
            }
          }}
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
        </Pressable>

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, 12)
          }
        ]}>
          {Object.keys(usersTyping).length > 0 && (
            <View style={[styles.typingIndicator, { borderTopColor: theme.slate200 }]}>
              <Text style={[styles.typingText, { color: theme.slate500 }]}>
                {Object.values(usersTyping).join(', ')} {Object.keys(usersTyping).length === 1 ? 'is' : 'are'} typing...
              </Text>
            </View>
          )}
          <View style={[styles.inputPill, { backgroundColor: theme.slate200 + '33', borderColor: theme.slate200 }]}>
            <TouchableOpacity style={styles.inputIconButton}>
              <Ionicons name="add" size={24} color={theme.slate400} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: theme.slate900 }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.slate400}
              value={inputText}
              onChangeText={handleTextChange}
              onFocus={() => setShowEmojiPicker(false)}
              multiline
            />

            <TouchableOpacity style={styles.inputIconButton} onPress={handleToggleEmojiPicker}>
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

        <EmojiPicker
          onEmojiSelected={handlePickEmoji}
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          categoryPosition="top"
        />
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
    paddingHorizontal: 8,
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
    paddingHorizontal: 4,
  },
  messageContentWrap: {
    maxWidth: '86%',
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
    maxWidth: '100%',
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
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  reactionPickerRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  reactionPickerEmojiButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPickerEmoji: {
    fontSize: 18,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
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

