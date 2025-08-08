import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Modal, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addTodo, fetchTodos } from '../../app/api/todos';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

interface Todo {
  id: number;
  todo: string;
  dueDate: Date | string;
  completed: boolean;
  userId?: number;
}

interface Section {
  title: string;
  data: Todo[];
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const { data: apiTodos, isLoading, error } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  const colorScheme = useColorScheme();

  const [expandedSections, setExpandedSections] = useState({ 今天: true, 未來: false, 已完成: true });
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date());
  const [editTodoText, setEditTodoText] = useState('');
  const [editDueDate, setEditDueDate] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localTodos, setLocalTodos] = useState<Todo[]>([]);
  const [isEditing, setIsEditing] = useState<{ [key: number]: boolean }>({});
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'add' | 'edit' | null>(null);
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);

  const animation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (apiTodos) {
      setLocalTodos(apiTodos.map((todo) => ({ ...todo, dueDate: normalizeDate(todo.dueDate) })));
    }
  }, [apiTodos]);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!Device.isDevice) {
        Alert.alert('錯誤', '此設備不支持通知！');
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') Alert.alert('錯誤', '需要通知權限！');
    };
    setupNotifications();
  }, []);

  const normalizeDate = (dueDate: Date | string): Date => {
    const date = dueDate instanceof Date && !isNaN(dueDate.getTime()) ? dueDate : new Date(dueDate);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const scheduleNotification = async (todo: Todo) => {
    try {
      const triggerDate = normalizeDate(todo.dueDate);
      const now = new Date();
      if (triggerDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: '待辦事項提醒', body: `${todo.todo} 快到期！`, data: { todoId: todo.id } },
          trigger: { date: triggerDate },
        });
        console.log(`已為 ${todo.todo} 調度通知，時間: ${triggerDate.toISOString()}`);
      }
    } catch (error) {
      console.error('通知調度失敗:', error);
    }
  };

  const handleOpenDatePicker = (type: 'add' | 'edit') => {
    setPickerType(type);
    setPickerStep('date');
    setShowPicker(true);
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (pickerType === 'add') {
        const updatedDate = new Date(newDueDate);
        updatedDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setNewDueDate(updatedDate);
      } else if (pickerType === 'edit') {
        const updatedDate = new Date(editDueDate);
        updatedDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setEditDueDate(updatedDate);
      }
      setPickerStep('time');
    } else {
      setShowPicker(false);
    }
  };

  const handleTimeChange = (event: any, selectedDate: Date | undefined) => {
    setShowPicker(false);
    setPickerStep(null);
    if (selectedDate) {
      if (pickerType === 'add') {
        const updatedDate = new Date(newDueDate);
        updatedDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        setNewDueDate(updatedDate);
      } else if (pickerType === 'edit') {
        const updatedDate = new Date(editDueDate);
        updatedDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        setEditDueDate(updatedDate);
      }
    }
  };

  const mutation = useMutation({
    mutationFn: (newTodo: { text: string; dueDate: Date }) => addTodo(newTodo.text, newDueDate),
    onSuccess: (data) => {
      const todoWithDate = { ...data, dueDate: normalizeDate(data.dueDate) };
      setLocalTodos((prev) => [...prev, todoWithDate]);
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      scheduleNotification(todoWithDate);
      setSuccessMessage('添加成功！');
      setTimeout(() => {
        setAddModalVisible(false);
        setNewTodoText('');
        setNewDueDate(new Date());
        setSuccessMessage('');
      }, 1000);
    },
    onError: (error) => {
      console.error('添加失敗:', error);
      setErrorMessage(`添加失敗: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedTodo: { id: number; text: string; dueDate: Date }) =>
      new Promise((resolve) => setTimeout(() => resolve(updatedTodo), 500)),
    onSuccess: (data) => {
      const todoWithDate = { id: data.id, todo: data.text, dueDate: normalizeDate(data.dueDate), completed: false };
      setLocalTodos((prev) => prev.map((todo) => (todo.id === data.id ? todoWithDate : todo)));
      queryClient.setQueryData(['todos'], (oldData: Todo[] | undefined) =>
        oldData?.map((todo) => (todo.id === data.id ? todoWithDate : todo)),
      );
      scheduleNotification(todoWithDate);
      setIsEditing((prev) => ({ ...prev, [data.id]: false }));
      setShowPicker(false);
      setPickerType(null);
      setSuccessMessage('更新成功！');
      setTimeout(() => setSuccessMessage(''), 1000);
    },
    onError: (error) => setErrorMessage(`更新失敗: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => new Promise((resolve) => setTimeout(() => resolve(id), 500)),
    onSuccess: (id) => {
      setLocalTodos((prev) => prev.filter((todo) => todo.id !== id));
      queryClient.setQueryData(['todos'], (oldData: Todo[] | undefined) => oldData?.filter((todo) => todo.id !== id));
      Notifications.cancelScheduledNotificationAsync(id.toString());
      setSuccessMessage('刪除成功！');
      setTimeout(() => setSuccessMessage(''), 1000);
    },
    onError: (error) => setErrorMessage(`刪除失敗: ${error.message}`),
  });

  const handleUpdateTodo = (id: number) => {
    if (!editTodoText.trim()) {
      setErrorMessage('請輸入內容！');
      return;
    }
    updateMutation.mutate({ id, text: editTodoText, dueDate: editDueDate });
  };

  const handleDeleteTodo = (id: number) => {
    Alert.alert('確認', '確定要刪除此任務？', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const handleClearCompleted = () => {
    const completedIds = localTodos.filter((todo) => todo.completed).map((todo) => todo.id);
    completedIds.forEach((id) => deleteMutation.mutate(id));
  };

  const sections: Section[] = [
    {
      title: '今天',
      data: localTodos.filter((todo) => {
        const dueDate = normalizeDate(todo.dueDate);
        const today = new Date();
        return !todo.completed && dueDate.toDateString() === today.toDateString();
      }),
    },
    {
      title: '未來',
      data: localTodos.filter((todo) => {
        const dueDate = normalizeDate(todo.dueDate);
        const today = new Date();
        return !todo.completed && dueDate > today;
      }),
    },
    {
      title: '已完成',
      data: localTodos.filter((todo) => todo.completed),
    },
  ];

  const renderItem = ({ item }: { item: Section }) => (
    <View style={styles.sectionHeader}>
      <TouchableOpacity
        style={styles.sectionTitleContainer}
        onPress={() => setExpandedSections((prev) => ({ ...prev, [item.title]: !prev[item.title] }))}
      >
        <ThemedText style={styles.sectionTitleText}>{item.title} ({item.data.length})</ThemedText>
        <Ionicons
          name={expandedSections[item.title] ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={Colors[colorScheme ?? 'light'].tint}
        />
      </TouchableOpacity>
      {expandedSections[item.title] && (
        <View>
          {item.data.map((todo) => (
            <View key={todo.id} style={styles.taskContainer}>
              <View style={styles.taskItem}>
                <TouchableOpacity style={styles.checkboxContainer}>
                  <Ionicons
                    name={todo.completed ? 'checkbox' : 'square-outline'}
                    size={24}
                    style={todo.completed ? styles.checkboxCompleted : styles.checkboxIncomplete}
                  />
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  {isEditing[todo.id] ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        value={editTodoText}
                        onChangeText={setEditTodoText}
                        style={styles.input}
                        multiline
                      />
                      <TouchableOpacity style={styles.dateTimeButton} onPress={() => handleOpenDatePicker('edit')}>
                        <ThemedText style={styles.dateTimeText}>
                          選擇截止時間: {normalizeDate(editDueDate).toLocaleString()}
                        </ThemedText>
                      </TouchableOpacity>
                      <View style={styles.editButtons}>
                        <Button
                          mode="contained"
                          onPress={() => handleUpdateTodo(todo.id)}
                          style={styles.updateButton}
                        >
                          更新
                        </Button>
                        <Button
                          mode="contained"
                          onPress={() => setIsEditing((prev) => ({ ...prev, [todo.id]: false }))}
                          style={styles.cancelButton}
                        >
                          取消
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <>
                      <ThemedText style={[styles.todoText, todo.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                        {todo.todo}
                      </ThemedText>
                      <ThemedText style={styles.dueDate}>截止: {normalizeDate(todo.dueDate).toLocaleString()}</ThemedText>
                    </>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      setIsEditing((prev) => ({ ...prev, [todo.id]: true }));
                      setEditTodoText(todo.todo);
                      setEditDueDate(normalizeDate(todo.dueDate));
                    }}
                    style={styles.editButton}
                  >
                    編輯
                  </Button>
                  <Button mode="contained" onPress={() => handleDeleteTodo(todo.id)} style={styles.deleteButton}>
                    刪除
                  </Button>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const handleAddTodo = () => {
    if (!newTodoText.trim()) {
      setErrorMessage('請輸入內容！');
      return;
    }
    const dueDate = normalizeDate(newDueDate);
    if (isNaN(dueDate.getTime())) {
      setErrorMessage('無效日期！');
      return;
    }
    setErrorMessage('');
    mutation.mutate({ text: newTodoText, dueDate });
  };

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
        <LottieView
          source={require('../../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
          accessibilityLabel="任務加載動畫"
          onError={(error) => console.error('Lottie Error:', error)}
        />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <ThemedText type="title" style={styles.title}>待辦事項</ThemedText>
        {error ? (
          <ThemedText style={styles.errorText}>錯誤: {error.message}</ThemedText>
        ) : (
          <View>
            <FlatList
              data={sections}
              keyExtractor={(item) => item.title}
              renderItem={renderItem}
              ListEmptyComponent={<ThemedText>無任務</ThemedText>}
            />
            {localTodos.some((todo) => todo.completed) && (
              <Button mode="contained" onPress={handleClearCompleted} style={styles.clearButton}>
                <ThemedText style={styles.clearButtonText}>清理已完成</ThemedText>
              </Button>
            )}
          </View>
        )}
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <ThemedText style={styles.addButtonText}>+</ThemedText>
        </TouchableOpacity>
        <Modal visible={isAddModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
          <View style={styles.modalContainer}>
            <ThemedView style={styles.modalContent}>
              <ThemedText type="subtitle">新增任務</ThemedText>
              {errorMessage && <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>}
              {successMessage && <ThemedText style={styles.successText}>{successMessage}</ThemedText>}
              <TextInput
                placeholder="輸入任務"
                value={newTodoText}
                onChangeText={setNewTodoText}
                style={styles.input}
                multiline
              />
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => handleOpenDatePicker('add')}>
                <ThemedText style={styles.dateTimeText}>
                  選擇截止時間: {normalizeDate(newDueDate).toLocaleString()}
                </ThemedText>
              </TouchableOpacity>
              {showPicker && pickerType === 'add' && (
                <DateTimePicker
                  value={newDueDate}
                  mode={pickerStep === 'date' ? 'date' : 'time'}
                  display="default"
                  onChange={pickerStep === 'date' ? handleDateChange : handleTimeChange}
                />
              )}
              <View style={styles.modalButtons}>
                <Button mode="contained" onPress={handleAddTodo} style={styles.addButtonStyle}>
                  添加
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setAddModalVisible(false);
                    setNewTodoText('');
                    setNewDueDate(new Date());
                    setPickerType(null);
                    setPickerStep(null);
                  }}
                  style={styles.cancelButtonStyle}
                >
                  取消
                </Button>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3436',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
  },
  taskContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    color: '#00b894',
  },
  checkboxIncomplete: {
    color: '#dfe6e9',
  },
  taskContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#2d3436',
    lineHeight: 22,
  },
  dueDate: {
    fontSize: 13,
    color: '#636e72',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  editButton: {
    marginRight: 8,
    backgroundColor: '#0984e3',
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#d63031',
    borderRadius: 6,
  },
  editContainer: {
    padding: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#2d3436',
  },
  dateTimeButton: {
    padding: 12,
    backgroundColor: '#f1f3f5',
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#2d3436',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  updateButton: {
    marginRight: 8,
    backgroundColor: '#00b894',
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#636e72',
    borderRadius: 6,
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: '#d63031',
    borderRadius: 8,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0984e3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0984e3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 30,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  addButtonStyle: {
    marginRight: 8,
    backgroundColor: '#0984e3',
    borderRadius: 6,
  },
  cancelButtonStyle: {
    backgroundColor: '#636e72',
    borderRadius: 6,
  },
  errorText: {
    color: '#d63031',
    marginBottom: 12,
    fontSize: 14,
  },
  successText: {
    color: '#00b894',
    marginBottom: 12,
    fontSize: 14,
  },
};