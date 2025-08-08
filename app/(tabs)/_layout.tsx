import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '../../components/HapticTab';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
          },
          android: {
            elevation: 8,
          },
        }),
        lazy: true,
        detachInactiveScreens: true,
        unmountOnBlur: false,
      }}
      sceneContainerStyle={{
        backgroundColor: Colors[colorScheme ?? 'light'].background,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '任務',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            console.log('任務頁面被點擊');
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '日曆',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-sharp" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}