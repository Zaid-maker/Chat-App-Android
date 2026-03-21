import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <BlurView 
        intensity={Platform.OS === 'ios' ? 80 : 100} 
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.tabBar, 
          { 
            borderColor: theme.slate200,
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : (colorScheme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)')
          }
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Map route names to icons
          let iconName: any = 'chatbubble-outline';
          if (route.name === 'messages') iconName = isFocused ? 'chatbubble' : 'chatbubble-outline';
          if (route.name === 'contacts') iconName = isFocused ? 'people' : 'people-outline';
          if (route.name === 'settings') iconName = isFocused ? 'settings' : 'settings-outline';
          if (route.name === 'calls') iconName = isFocused ? 'call' : 'call-outline';

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={iconName} 
                size={24} 
                color={isFocused ? theme.brandPrimary : theme.slate400} 
              />
              <Text style={[
                styles.label, 
                { 
                  color: isFocused ? theme.brandPrimary : theme.slate400,
                  fontWeight: isFocused ? '700' : '500' 
                }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 100,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    borderRadius: 35,
    paddingHorizontal: 10,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
