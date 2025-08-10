import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '../../components/HapticTab';
import { Colors } from '../../constants/Colors';

// 設置應用程式顏色
const appColors = Colors.light || {
  background: '#F5F7FA',
  tint: '#4A90E2',
  text: '#333333',
  cardBackground: '#FFFFFF',
  error: '#E85D75',
  secondaryText: '#666666',
};

// 標籤頁佈局
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: appColors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: appColors.background,
        },
        lazy: true,
        detachInactiveScreens: true,
        unmountOnBlur: false,
      }}
      sceneContainerStyle={{
        backgroundColor: appColors.background,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '任務',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />,
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