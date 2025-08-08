import { Link, Stack } from 'expo-router';
import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <LottieView
          source={require('../assets/animations/error.json')} // 假設你有一個錯誤動畫
          autoPlay
          loop
          style={{ width: 200, height: 200, marginBottom: 20 }}
          accessibilityLabel="頁面未找到動畫"
        />
        <ThemedText type="title">此頁面不存在</ThemedText>
        <Link href="/(tabs)/index" style={styles.link}>
          <ThemedText type="link">返回首頁</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});