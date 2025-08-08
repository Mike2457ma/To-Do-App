import { useQuery } from '@tanstack/react-query';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTodos } from '../../app/api/todos';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

const styles = {
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3436',
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
  },
  dotColor: '#00b894',
  backgroundColor: '#f8f9fa',
  calendarBackground: '#ffffff',
  textSectionTitleColor: '#636e72',
  selectedDayBackgroundColor: '#0984e3',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#0984e3',
  dayTextColor: '#2d3436',
  textDisabledColor: '#dfe6e9',
  arrowColor: '#0984e3',
  monthTextColor: '#2d3436',
  indicatorColor: '#0984e3',
};

const calendarTheme = {
  backgroundColor: styles.backgroundColor,
  calendarBackground: styles.calendarBackground,
  textSectionTitleColor: styles.textSectionTitleColor,
  selectedDayBackgroundColor: styles.selectedDayBackgroundColor,
  selectedDayTextColor: styles.selectedDayTextColor,
  todayTextColor: styles.todayTextColor,
  dayTextColor: styles.dayTextColor,
  textDisabledColor: styles.textDisabledColor,
  arrowColor: styles.arrowColor,
  monthTextColor: styles.monthTextColor,
  indicatorColor: styles.indicatorColor,
  textDayFontWeight: '400',
  textMonthFontWeight: 'bold',
  textDayHeaderFontWeight: '500',
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 14,
  'stylesheet.calendar.header': {
    week: {
      marginTop: 5,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
  },
};

export default function CalendarScreen() {
  const { data: todos = [], isLoading } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  const [markedDates, setMarkedDates] = useState({});
  const colorScheme = useColorScheme();

  useEffect(() => {
    const marks = {};
    todos.forEach((todo) => {
      const dateStr = new Date(todo.dueDate).toISOString().split('T')[0];
      marks[dateStr] = {
        marked: true,
        dotColor: styles.dotColor,
        activeOpacity: 0.7,
      };
    });
    setMarkedDates(marks);
  }, [todos]);

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
        <LottieView
          source={require('../../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
          accessibilityLabel="日曆加載動畫"
        />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <ThemedText type="title" style={styles.title}>日曆</ThemedText>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => {
            const dateTodos = todos.filter((todo) => new Date(todo.dueDate).toISOString().split('T')[0] === day.dateString);
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
    </SafeAreaView>
  );
}