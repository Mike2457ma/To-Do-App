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
  dotColor: '#E85D75',
  selectedDayBackgroundColor: '#E85D75',
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: '#E85D75',
  dayTextColor: '#FFFFFF',
  textDisabledColor: '#666666',
  arrowColor: '#E85D75',
  monthTextColor: '#FFFFFF',
  indicatorColor: '#E85D75',
  textSectionTitleColor: '#CCCCCC',
};

const calendarTheme = {
  calendarBackground: '#1E1E1E',
  textSectionTitleColor: '#CCCCCC',
  selectedDayBackgroundColor: '#E85D75',
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: '#E85D75',
  dayTextColor: '#FFFFFF',
  textDisabledColor: '#666666',
  arrowColor: '#E85D75',
  monthTextColor: '#FFFFFF',
  indicatorColor: '#E85D75',
};

export default function CalendarScreen() {
  // 載入任務資料
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTodos });
  const [dateMarks, setDateMarks] = useState({});

  // 更新日曆標記
  useEffect(() => {
    const marks = {};
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task.dueDate) {
        continue;
      }
      const dateStr = new Date(task.dueDate).toISOString().split('T')[0];
      marks[dateStr] = {
        marked: true,
        dotColor: '#E85D75',
        activeOpacity: 0.7,
      };
    }
    setDateMarks(marks);
  }, [tasks]);

  // 顯示載入動畫
  if (isLoading) {
    return (
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
            accessibilityLabel="日曆載入動畫"
          />
        </ThemedView>
      </ImageBackground>
    );
  }

  // 渲染日曆畫面
  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>日曆</ThemedText>
          <Calendar
            markedDates={dateMarks}
            onDayPress={(day) => {
              const dateTasks = [];
              for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                if (!task.dueDate) continue;
                if (new Date(task.dueDate).toISOString().split('T')[0] === day.dateString) {
                  dateTasks.push(task);
                }
              }
              if (dateTasks.length > 0) {
                Alert.alert(
                  `${day.dateString} 的任務`,
                  dateTasks.map((t) => `• ${t.todo}`).join('\n'),
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