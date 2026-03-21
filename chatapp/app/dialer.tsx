import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

const DIAL_PAD = [
  { key: '1', sub: '' }, { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' }, { key: '0', sub: '+' }, { key: '#', sub: '' },
];

export default function DialerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [number, setNumber] = useState('');

  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNumber(prev => prev + key);
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNumber(prev => prev.slice(0, -1));
  };

  const formatNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return num;
    
    let formatted = '';
    if (match[1]) formatted += `(${match[1]}`;
    if (match[2]) formatted += `) ${match[2]}`;
    if (match[3]) formatted += `-${match[3]}`;
    
    return formatted;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.brandBackground }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.slate900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.slate900 }]}>Phone</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.slate900} />
        </TouchableOpacity>
      </View>

      {/* Number Display */}
      <View style={styles.displayContainer}>
        <Text style={[styles.displayNumber, { color: theme.slate900 }]} numberOfLines={1}>
          {formatNumber(number) || ' '}
        </Text>
        
        {number.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addAction}>
              <Ionicons name="person-add" size={18} color="#FF6B00" />
              <Text style={styles.addActionText}>Add to Contacts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
              <Ionicons name="backspace" size={24} color={theme.slate400} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dialer Grid */}
      <View style={styles.gridContainer}>
        {DIAL_PAD.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.dialButton, { backgroundColor: theme.slate200 + '80' }]}
            onPress={() => handlePress(item.key)}
          >
            <Text style={[styles.dialKey, { color: theme.slate900 }]}>{item.key}</Text>
            {item.sub ? <Text style={[styles.dialSub, { color: theme.slate500 }]}>{item.sub}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Call Button Area */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.callButton, { backgroundColor: '#22C55E' }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        >
          <Ionicons name="call" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
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
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    padding: 5,
  },
  moreButton: {
    padding: 5,
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  displayNumber: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  addAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addActionText: {
    color: '#FF6B00',
    fontSize: 15,
    fontWeight: '600',
  },
  backspaceButton: {
    position: 'absolute',
    right: 0,
    padding: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
    marginBottom: 40,
  },
  dialButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialKey: {
    fontSize: 28,
    fontWeight: '500',
  },
  dialSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
