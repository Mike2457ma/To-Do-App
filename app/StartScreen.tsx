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
      if (animationRef.current) {
        console.log('Timeout triggered, navigating to /(tabs)/index');
        router.replace('/(tabs)');
      }
    }, 2000);

    // 清理定時器
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
      <LottieView
      ref={animationRef}
      source={require('../assets/animations/Task Done.json')}
      autoPlay
      loop={false}
      style={{ width: 350, height: 350, backgroundColor: '#000000' }}
      onAnimationFinish={() => {
        console.log('Animation finished, navigating to /(tabs)/index');
        router.replace('/(tabs)');
      }}
      onError={(error: unknown) => console.error('啟動動畫錯誤:', error)}
      />
    </ThemedView>
  );
}