import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addTodo, fetchTodos } from '../../app/api/todos';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
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
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!Device.isDevice) {
        alert('這設備沒法進行通知！');
        return;
      }
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          console.log('Notification channel created successfully');
        } catch (error) {
          console.error('Failed to create notification channel:', error);
        }
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationEnabled(true);
        console.log('Notification permissions granted');
      } else {
        alert('通知權限被拒絕！請手動啟用。');
        setNotificationEnabled(false);
        Linking.openSettings(); // 引導用戶到設置頁面
      }
    };
    setupNotifications();
  }, []);

  const normalizeDate = (dueDate: Date | string): Date => {
    return dueDate instanceof Date && !isNaN(dueDate.getTime()) ? dueDate : new Date(dueDate);
  };

  const scheduleNotification = async (todo: Todo) => {
    if (!notificationEnabled) return;
    try {
      const triggerDate = new Date(normalizeDate(todo.dueDate));
      triggerDate.setHours(triggerDate.getHours() - 1); // 提前一小時
      if (triggerDate < new Date()) {
        console.log('Trigger date is in the past, skipping notification:', triggerDate.toISOString());
        return;
      }
      console.log('Scheduling notification for:', triggerDate.toISOString());
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '待辦事項提醒',
          body: `${todo.todo} 快到期！`,
          data: { todoId: todo.id.toString() },
        },
        trigger: { date: triggerDate },
      });
      console.log('Notification scheduled successfully');
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  };

  const mutation = useMutation({
    mutationFn: (newTodo: { todo: string; dueDate: Date }) => addTodo(newTodo),
    onSuccess: (data) => {
      const todoWithDate = { ...data, dueDate: normalizeDate(data.dueDate) };
      setLocalTodos((prev) => {
        const uniqueTodos = [...prev, todoWithDate].filter((todo, index, self) =>
          index === self.findIndex((t) => t.id === todo.id)
        ).sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
        return uniqueTodos;
      });
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
      console.error('添加待辦事項失敗:', error);
      setErrorMessage(`添加待辦事項失敗: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedTodo: { id: number; text: string; dueDate: Date }) =>
      new Promise((resolve) => setTimeout(() => resolve(updatedTodo), 500)),
    onSuccess: (data) => {
      const todoWithDate = { id: data.id, todo: data.text, dueDate: normalizeDate(data.dueDate), completed: false };
      setLocalTodos((prev) => {
        const uniqueTodos = prev.map((todo) => (todo.id === data.id ? todoWithDate : todo)).filter((todo, index, self) =>
          index === self.findIndex((t) => t.id === todo.id)
        ).sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
        return uniqueTodos;
      });
      queryClient.setQueryData(['todos'], (oldData: Todo[] | undefined) =>
        oldData?.map((todo) => (todo.id === data.id ? todoWithDate : todo))
      );
      scheduleNotification(todoWithDate);
      setIsEditing((prev) => ({ ...prev, [data.id]: false }));
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

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      new Promise((resolve) => setTimeout(() => resolve({ id, completed }), 500)),
    onSuccess: (data) => {
      setLocalTodos((prev) => prev.map((todo) => (todo.id === data.id ? { ...todo, completed: data.completed } : todo)));
      queryClient.setQueryData(['todos'], (oldData: Todo[] | undefined) =>
        oldData?.map((todo) => (todo.id === data.id ? { ...todo, completed: data.completed } : todo))
      );
      if (data.completed) Notifications.cancelScheduledNotificationAsync(data.id.toString());
      setSuccessMessage('狀態更新成功！');
      setTimeout(() => setSuccessMessage(''), 1000);
    },
    onError: (error) => setErrorMessage(`更新狀態失敗: ${error.message}`),
  });

  const clearCompletedMutation = useMutation({
    mutationFn: () => new Promise((resolve) => setTimeout(() => resolve(null), 500)),
    onSuccess: () => {
      const completedIds = localTodos.filter((todo) => todo.completed).map((todo) => todo.id.toString());
      setLocalTodos((prev) => prev.filter((todo) => !todo.completed));
      queryClient.setQueryData(['todos'], (oldData: Todo[] | undefined) => oldData?.filter((todo) => !todo.completed));
      completedIds.forEach((id) => Notifications.cancelScheduledNotificationAsync(id));
      setSuccessMessage('清理成功！');
      setTimeout(() => setSuccessMessage(''), 1000);
    },
    onError: (error) => setErrorMessage(`清理失敗: ${error.message}`),
  });

  const handleAddTodo = () => {
    if (!newTodoText.trim()) {
      setErrorMessage('請輸入內容！');
      return;
    }
    if (!newDueDate || isNaN(newDueDate.getTime())) {
      setErrorMessage('無效日期！');
      return;
    }
    setErrorMessage('');
    mutation.mutate({ todo: newTodoText, dueDate: newDueDate });
  };

  const handleUpdateTodo = (id: number) => {
    if (!editTodoText.trim()) {
      setErrorMessage('請輸入內容！');
      return;
    }
    if (!editDueDate || isNaN(editDueDate.getTime())) {
      setErrorMessage('無效日期！');
      return;
    }
    updateMutation.mutate({ id, text: editTodoText, dueDate: editDueDate });
  };

  const handleDeleteTodo = (id: number) => deleteMutation.mutate(id);
  const handleToggleComplete = (id: number, completed: boolean) => toggleCompleteMutation.mutate({ id, completed });
  const handleClearCompleted = () =>
    Alert.alert('確認', '刪除所有已完成任務？', [
      { text: '取消' },
      { text: '確認', style: 'destructive', onPress: () => clearCompletedMutation.mutate() },
    ]);

  const showDatePicker = (setDate: (date: Date) => void, currentDate: Date) => {
    if (Platform.OS === 'android') {
      // 先選擇日期
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        display: 'default',
        onChange: (event, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const updatedDate = new Date(currentDate); // 保留原始時間
            updatedDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            // 然後選擇時間
            DateTimePickerAndroid.open({
              value: updatedDate,
              mode: 'time',
              display: 'default',
              onChange: (eventTime, selectedTime?: Date) => {
                if (eventTime.type === 'set' && selectedTime) {
                  updatedDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                  setDate(updatedDate);
                }
              },
            });
          }
        },
      });
    } else {
      // iOS 使用模態 DateTimePicker
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'datetime',
        display: 'default',
        onChange: (event, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            setDate(selectedDate);
          }
        },
      });
    }
  };

  const todos = React.useMemo(() => {
    const normalizedTodos = [...(apiTodos || []), ...localTodos].map(todo => ({
      ...todo,
      dueDate: normalizeDate(todo.dueDate),
    })).filter((todo, index, self) =>
      index === self.findIndex((t) => t.id === todo.id)
    );
    return normalizedTodos.sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
  }, [apiTodos, localTodos]);

  const sections = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 只比較日期部分
    return [
      { title: '今天', data: todos.filter((todo) => !todo.completed && normalizeDate(todo.dueDate).toDateString() === today.toDateString()) },
      { title: '未來', data: todos.filter((todo) => !todo.completed && normalizeDate(todo.dueDate).toDateString() > today.toDateString()) },
      { title: '已完成', data: todos.filter((todo) => todo.completed) },
    ];
  }, [todos]);

  const toggleSection = (title: string) => setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  const renderItem = ({ item }: { item: Section }) => (
    <View>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(item.title)} activeOpacity={0.8}>
        <ThemedText style={styles.sectionTitle}>{item.title} ({item.data.length})</ThemedText>
        <Ionicons name={expandedSections[item.title] ? 'chevron-down' : 'chevron-forward'} size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
      </TouchableOpacity>
      {expandedSections[item.title] && (
        <FlatList
          data={item.data}
          keyExtractor={(todo) => todo.id.toString()}
          renderItem={({ item: todo }) => (
            <View style={styles.taskContainer}>
              {isEditing[todo.id] ? (
                <View>
                  <TextInput
                    style={styles.input}
                    value={editTodoText}
                    onChangeText={setEditTodoText}
                    placeholder="編輯任務"
                    multiline
                  />
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => showDatePicker(setEditDueDate, editDueDate)}>
                    <ThemedText style={styles.dateTimeText}>截止: {editDueDate.toLocaleString()}</ThemedText>
                  </TouchableOpacity>
                  <View style={styles.modalButtons}>
                    <Button mode="contained" style={styles.addButtonStyle} onPress={() => handleUpdateTodo(todo.id)}>
                      <ThemedText style={styles.modalButtonText}>保存</ThemedText>
                    </Button>
                    <Button mode="contained" style={styles.cancelButton} onPress={() => {
                      setIsEditing((prev) => ({ ...prev, [todo.id]: false }));
                      setEditTodoText(todo.todo);
                      setEditDueDate(normalizeDate(todo.dueDate));
                    }}>
                      <ThemedText style={styles.modalButtonText}>取消</ThemedText>
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.taskItem}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggleComplete(todo.id, !todo.completed)}
                  >
                    <Ionicons
                      name={todo.completed ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={todo.completed ? '#4CAF50' : colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                  <View style={styles.taskContent}>
                    <ThemedText style={[styles.todoText, todo.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                      {todo.todo}
                    </ThemedText>
                    <ThemedText style={styles.dueDate}>截止: {normalizeDate(todo.dueDate).toLocaleString()}</ThemedText>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={() => {
                      setIsEditing((prev) => ({ ...prev, [todo.id]: true }));
                      setEditTodoText(todo.todo);
                      setEditDueDate(normalizeDate(todo.dueDate));
                    }}>
                      <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTodo(todo.id)}>
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<ThemedText style={{ textAlign: 'center', padding: 16 }}>無任務</ThemedText>}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, paddingTop: 16 }}>
        <ThemedText type="title" style={{ fontSize: 24, textAlign: 'center', marginBottom: 16 }}>
          待辦事項
        </ThemedText>
        {isLoading ? (
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={{ width: 100, height: 100, alignSelf: 'center' }}
          />
        ) : error ? (
          <ThemedText style={{ color: 'red', textAlign: 'center', padding: 16 }}>錯誤: {error.message}</ThemedText>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(item) => item.title}
            renderItem={renderItem}
            ListHeaderComponent={
              errorMessage ? <ThemedText style={{ color: 'red', textAlign: 'center', padding: 8 }}>{errorMessage}</ThemedText> : null
            }
            ListFooterComponent={
              successMessage ? <ThemedText style={{ color: 'green', textAlign: 'center', padding: 8 }}>{successMessage}</ThemedText> : null
            }
          />
        )}
        {localTodos.some((todo) => todo.completed) && (
          <Button
            mode="contained"
            style={{ margin: 16, backgroundColor: '#E85D75', borderRadius: 6 }}
            onPress={handleClearCompleted}
          >
            <ThemedText style={{ color: '#FFFFFF' }}>清理已完成</ThemedText>
          </Button>
        )}
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Modal visible={isAddModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
          <View style={styles.modalContainer}>
            <ThemedView style={styles.modalContent}>
              <ThemedText type="title" style={{ fontSize: 18, marginBottom: 16 }}>新增任務</ThemedText>
              {errorMessage && <ThemedText style={{ color: 'red', marginBottom: 8 }}>{errorMessage}</ThemedText>}
              {successMessage && <ThemedText style={{ color: 'green', marginBottom: 8 }}>{successMessage}</ThemedText>}
              <TextInput
                style={styles.input}
                value={newTodoText}
                onChangeText={setNewTodoText}
                placeholder="輸入任務"
                multiline
              />
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => showDatePicker(setNewDueDate, newDueDate)}>
                <ThemedText style={styles.dateTimeText}>截止: {newDueDate.toLocaleString()}</ThemedText>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <Button mode="contained" style={styles.addButtonStyle} onPress={handleAddTodo}>
                  <ThemedText style={styles.modalButtonText}>添加</ThemedText>
                </Button>
                <Button mode="contained" style={styles.cancelButton} onPress={() => {
                  setAddModalVisible(false);
                  setNewTodoText('');
                  setNewDueDate(new Date());
                }}>
                  <ThemedText style={styles.modalButtonText}>取消</ThemedText>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F7FA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dfe6e9',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 8,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  todoText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
  },
  dueDate: {
    fontSize: 12,
    color: '#666666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  editButton: {
    marginRight: 4,
    backgroundColor: '#4A90E2',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: '#E85D75',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  dateTimeButton: {
    padding: 10,
    backgroundColor: '#F5F7FA',
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333333',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  addButtonStyle: {
    marginRight: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#666666',
    borderRadius: 6,
  },
  modalButtonText: {
    color: '#FFFFFF',
  },
};