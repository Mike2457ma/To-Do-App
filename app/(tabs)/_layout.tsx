import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '../../components/HapticTab';
import { Colors } from '../../constants/Colors';

// 防護機制，確保 Colors.light 存在，並添加詳細日誌
const AppColors = Colors.light || {
  background: '#F5F7FA',
  tint: '#4A90E2',
  text: '#333333',
  cardBackground: '#FFFFFF',
  error: '#E85D75',
  secondaryText: '#666666',
};
console.log('Colors loaded:', Colors);
console.log('safeColors:', AppColors); // 檢查所有屬性

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: AppColors.background,
        },
        lazy: true,
        detachInactiveScreens: true,
        unmountOnBlur: false,
      }}
      sceneContainerStyle={{
        backgroundColor: AppColors.background,
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