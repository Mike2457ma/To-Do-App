import { useQuery } from '@tanstack/react-query';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ImageBackground } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTodos } from '../../app/api/todos';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

const styles = {
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#1E1E1E',
  },
  dotColor: '#4A90E2',
  selectedDayBackgroundColor: '#4A90E2',
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: '#4A90E2',
  dayTextColor: '#FFFFFF',
  textDisabledColor: '#666666',
  arrowColor: '#4A90E2',
  monthTextColor: '#FFFFFF',
  indicatorColor: '#4A90E2',
  textSectionTitleColor: '#CCCCCC',
};

const calendarTheme = {
  calendarBackground: '#1E1E1E',
  textSectionTitleColor: '#CCCCCC',
  selectedDayBackgroundColor: '#4A90E2',
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: '#4A90E2',
  dayTextColor: '#FFFFFF',
  textDisabledColor: '#666666',
  arrowColor: '#4A90E2',
  monthTextColor: '#FFFFFF',
  indicatorColor: '#4A90E2',
};

export default function CalendarScreen() {
  const { data: todos = [], isLoading } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    const marks = {};
    todos.forEach((todo) => {
      if (!todo.dueDate) {
        console.warn('Todo without dueDate found, skipping:', todo);
        return;
      }
      const dateStr = new Date(todo.dueDate).toISOString().split('T')[0];
      marks[dateStr] = {
        marked: true,
        dotColor: '#4A90E2',
        activeOpacity: 0.7,
      };
    });
    setMarkedDates(marks);
  }, [todos]);

  if (isLoading) {
    return (
      <ImageBackground
        source={require('../../assets/images/background.jpg')} // 修正為從 (tabs) 文件夾的相對路徑
        style={{ flex: 1 }}
        resizeMode="cover"
        onError={(e) => console.log('Image load error in CalendarScreen:', e.nativeEvent.error)}
        onLoad={() => console.log('Image loaded successfully in CalendarScreen')}
      >
        <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
            accessibilityLabel="日曆加載動畫"
          />
        </ThemedView>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/images/background.jpg')} // 修正為從 (tabs) 文件夾的相對路徑
        style={{ flex: 1 }}
        resizeMode="cover"
        onError={(e) => console.log('Image load error in CalendarScreen:', e.nativeEvent.error)}
        onLoad={() => console.log('Image loaded successfully in CalendarScreen')}
      >
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>日曆</ThemedText>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => {
              const dateTodos = todos.filter((todo) => {
                if (!todo.dueDate) return false;
                return new Date(todo.dueDate).toISOString().split('T')[0] === day.dateString;
              });
              if (dateTodos.length > 0) {
                Alert.alert(
                  `${day.dateString} 的任務`,
                  dateTodos.map((t) => `• ${t.todo}`).join('\n'),
                  [{ text: '確定', style: 'default' }],
                );
              }
            }}
            theme={calendarTheme}
            style={styles.calendar}
            markingType={'multi-dot'}
          />
        </ThemedView>
      </ImageBackground>
    </SafeAreaView>
  );
}