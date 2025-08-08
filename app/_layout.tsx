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

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <LottieView
          source={require('../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
          accessibilityLabel="字體加載動畫"
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DefaultTheme}> {/* 強制使用 light 主題 */}
        <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="StartScreen" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" /> {/* 適配 light 模式 */}
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}