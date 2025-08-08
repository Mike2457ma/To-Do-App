import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { ThemedView } from '../components/ThemedView';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';

export default function StartScreen() {
  const animationRef = useRef<LottieView>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/index');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
      <LottieView
        ref={animationRef}
        source={require('../assets/animations/Task Done.json')}
        autoPlay
        loop={false}
        style={{ width: 300, height: 300 }}
        accessibilityLabel="啟動動畫"
        onAnimationFinish={() => router.replace('/(tabs)/index')}
        onError={(error) => console.error('啟動動畫錯誤:', error)}
      />
    </ThemedView>
  );
}