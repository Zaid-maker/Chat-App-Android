import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/constants/api';

export const useSocket = (conversationId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(API_BASE_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      if (conversationId) {
        socketRef.current?.emit('join_conversation', conversationId);
      }
    });

    socketRef.current.on('receive_message', (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [conversationId]);

  const sendMessage = (content: string, senderId: string) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit('send_message', {
        content,
        senderId,
        conversationId,
      });
    }
  };

  return { messages, sendMessage, isConnected };
};
