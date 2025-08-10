import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'expo-dev-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import React from 'react';
import { View } from 'react-native';
import { Colors } from '../constants/Colors';

const queryClient = new QueryClient();

// 應用程式根佈局
export default function RootLayout() {
  // 載入字體
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // 顯示字體載入動畫
  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <LottieView
          source={require('../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
          accessibilityLabel="字體載入動畫"
        />
      </View>
    );
  }

  // 渲染導航結構
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DefaultTheme}>
        <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="StartScreen" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}