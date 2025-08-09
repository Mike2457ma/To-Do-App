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

// 設置通知處理器
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const queryClient = useQueryClient();
  // 載入任務資料
  const { data: todos, isLoading, error } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  const colorScheme = useColorScheme();

  const [sectionsOpen, setSectionsOpen] = useState({ 今天: true, 未來: false, 已完成: true });
  const [addModal, setAddModal] = useState(false);
  const [todoText, setTodoText] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [editing, setEditing] = useState<{ [key: number]: boolean }>({});
  const [notifyOn, setNotifyOn] = useState(false);

  // 初始化通知設置
  useEffect(() => {
    const setupNotify = async () => {
      if (!Device.isDevice) {
        alert('設備不支援通知！');
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
        } catch (err) {
          console.error('設置通知通道失敗:', err);
        }
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifyOn(true);
      } else {
        alert('通知權限被拒絕！請手動啟用。');
        setNotifyOn(false);
        Linking.openSettings();
      }
    };
    setupNotify();
  }, []);

  // 標準化日期格式
  const normalizeDate = (date: Date | string): Date => {
    return date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date);
  };

  // 安排任務通知
  const scheduleNotify = async (todo: Todo) => {
    if (!notifyOn) return;
    try {
      const trigger = new Date(normalizeDate(todo.dueDate));
      trigger.setHours(trigger.getHours() - 1);
      if (trigger < new Date()) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '待辦事項提醒',
          body: `${todo.todo} 即將到期！`,
          data: { todoId: todo.id.toString() },
        },
        trigger: { date: trigger },
      });
    } catch (err) {
      console.error('安排通知失敗:', err);
    }
  };

  // 添加任務
  const addMutation = useMutation({
    mutationFn: (newTask: { todo: string; dueDate: Date }) => addTodo(newTask),
    onSuccess: (data) => {
      const task = { ...data, dueDate: normalizeDate(data.dueDate) };
      setTasks((prev) => {
        const uniqueTasks = [...prev, task].filter((t, idx, self) =>
          idx === self.findIndex((x) => x.id === t.id)
        ).sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
        return uniqueTasks;
      });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      scheduleNotify(task);
      setSuccessMsg('任務添加成功！');
      setTimeout(() => {
        setAddModal(false);
        setTodoText('');
        setDueDate(new Date());
        setSuccessMsg('');
      }, 1000);
    },
    onError: (err) => {
      setErrorMsg(`添加任務失敗: ${err.message}`);
    },
  });

  // 更新任務
  const updateMutation = useMutation({
    mutationFn: (task: { id: number; text: string; dueDate: Date }) =>
      new Promise((resolve) => setTimeout(() => resolve(task), 500)),
    onSuccess: (data) => {
      const task = { id: data.id, todo: data.text, dueDate: normalizeDate(data.dueDate), completed: false };
      setTasks((prev) => {
        const uniqueTasks = prev.map((t) => (t.id === data.id ? task : t)).filter((t, idx, self) =>
          idx === self.findIndex((x) => x.id === t.id)
        ).sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
        return uniqueTasks;
      });
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) =>
        old?.map((t) => (t.id === data.id ? task : t))
      );
      scheduleNotify(task);
      setEditing((prev) => ({ ...prev, [data.id]: false }));
      setSuccessMsg('任務更新成功！');
      setTimeout(() => setSuccessMsg(''), 1000);
    },
    onError: (err) => setErrorMsg(`更新任務失敗: ${err.message}`),
  });

  // 刪除任務
  const deleteMutation = useMutation({
    mutationFn: (id: number) => new Promise((resolve) => setTimeout(() => resolve(id), 500)),
    onSuccess: (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => old?.filter((t) => t.id !== id));
      Notifications.cancelScheduledNotificationAsync(id.toString());
      setSuccessMsg('任務刪除成功！');
      setTimeout(() => setSuccessMsg(''), 1000);
    },
    onError: (err) => setErrorMsg(`刪除任務失敗: ${err.message}`),
  });

  // 切換任務完成狀態
  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      new Promise((resolve) => setTimeout(() => resolve({ id, completed }), 500)),
    onSuccess: (data) => {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? { ...t, completed: data.completed } : t)));
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) =>
        old?.map((t) => (t.id === data.id ? { ...t, completed: data.completed } : t))
      );
      if (data.completed) Notifications.cancelScheduledNotificationAsync(data.id.toString());
      setSuccessMsg('任務狀態更新成功！');
      setTimeout(() => setSuccessMsg(''), 1000);
    },
    onError: (err) => setErrorMsg(`更新任務狀態失敗: ${err.message}`),
  });

  // 清理已完成任務
  const clearCompletedMutation = useMutation({
    mutationFn: () => new Promise((resolve) => setTimeout(() => resolve(null), 500)),
    onSuccess: () => {
      const completedIds = tasks.filter((t) => t.completed).map((t) => t.id.toString());
      setTasks((prev) => prev.filter((t) => !t.completed));
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => old?.filter((t) => !t.completed));
      for (let i = 0; i < completedIds.length; i++) {
        Notifications.cancelScheduledNotificationAsync(completedIds[i]);
      }
      setSuccessMsg('已完成任務清理成功！');
      setTimeout(() => setSuccessMsg(''), 1000);
    },
    onError: (err) => setErrorMsg(`清理任務失敗: ${err.message}`),
  });

  // 處理添加任務
  const handleAdd = () => {
    if (!todoText.trim()) {
      setErrorMsg('請輸入任務內容！');
      return;
    }
    if (!dueDate || isNaN(dueDate.getTime())) {
      setErrorMsg('請選擇有效日期！');
      return;
    }
    setErrorMsg('');
    addMutation.mutate({ todo: todoText, dueDate });
  };

  // 處理更新任務
  const handleUpdate = (id: number) => {
    if (!editText.trim()) {
      setErrorMsg('請輸入任務內容！');
      return;
    }
    if (!editDate || isNaN(editDate.getTime())) {
      setErrorMsg('請選擇有效日期！');
      return;
    }
    updateMutation.mutate({ id, text: editText, dueDate: editDate });
  };

  // 處理刪除任務
  const handleDelete = (id: number) => deleteMutation.mutate(id);

  // 處理任務完成狀態
  const handleToggle = (id: number, completed: boolean) => toggleCompleteMutation.mutate({ id, completed });

  // 處理清理已完成任務
  const handleClear = () =>
    Alert.alert('確認', '刪除所有已完成任務？', [
      { text: '取消' },
      { text: '確認', style: 'destructive', onPress: () => clearCompletedMutation.mutate() },
    ]);

  // 顯示日期選擇器
  const showDatePicker = (setDate: (date: Date) => void, current: Date) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        display: 'default',
        onChange: (event, selected?: Date) => {
          if (event.type === 'set' && selected) {
            const updated = new Date(current);
            updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
            DateTimePickerAndroid.open({
              value: updated,
              mode: 'time',
              display: 'default',
              onChange: (eventTime, selectedTime?: Date) => {
                if (eventTime.type === 'set' && selectedTime) {
                  updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                  setDate(updated);
                }
              },
            });
          }
        },
      });
    } else {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'datetime',
        display: 'default',
        onChange: (event, selected?: Date) => {
          if (event.type === 'set' && selected) {
            setDate(selected);
          }
        },
      });
    }
  };

  // 計算任務列表
  const taskList = React.useMemo(() => {
    const normalized = [...(todos || []), ...tasks].map(t => ({
      ...t,
      dueDate: normalizeDate(t.dueDate),
    })).filter((t, idx, self) => idx === self.findIndex((x) => x.id === t.id));
    return normalized.sort((a, b) => normalizeDate(a.dueDate).getTime() - normalizeDate(b.dueDate).getTime());
  }, [todos, tasks]);

  // 計算任務分組
  const sections = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [
      { title: '今天', data: taskList.filter((t) => !t.completed && normalizeDate(t.dueDate).toDateString() === today.toDateString()) },
      { title: '未來', data: taskList.filter((t) => !t.completed && normalizeDate(t.dueDate).toDateString() > today.toDateString()) },
      { title: '已完成', data: taskList.filter((t) => t.completed) },
    ];
  }, [taskList]);

  // 切換分組展開狀態
  const toggleSection = (title: string) => setSectionsOpen((prev) => ({ ...prev, [title]: !prev[title] }));

  // 渲染分組
  const renderSection = ({ item }: { item: Section }) => (
    <View>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(item.title)} activeOpacity={0.8}>
        <ThemedText style={styles.sectionTitle}>{item.title} ({item.data.length})</ThemedText>
        <Ionicons name={sectionsOpen[item.title] ? 'chevron-down' : 'chevron-forward'} size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
      </TouchableOpacity>
      {sectionsOpen[item.title] && (
        <FlatList
          data={item.data}
          keyExtractor={(t) => t.id.toString()}
          renderItem={({ item: t }) => (
            <View style={styles.taskContainer}>
              {editing[t.id] ? (
                <View>
                  <TextInput
                    style={styles.input}
                    value={editText}
                    onChangeText={setEditText}
                    placeholder="編輯任務內容"
                    multiline
                  />
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => showDatePicker(setEditDate, editDate)}>
                    <ThemedText style={styles.dateTimeText}>截止日期: {editDate.toLocaleString()}</ThemedText>
                  </TouchableOpacity>
                  <View style={styles.modalButtons}>
                    <Button mode="contained" style={styles.addButtonStyle} onPress={() => handleUpdate(t.id)}>
                      <ThemedText style={styles.modalButtonText}>保存</ThemedText>
                    </Button>
                    <Button mode="contained" style={styles.cancelButton} onPress={() => {
                      setEditing((prev) => ({ ...prev, [t.id]: false }));
                      setEditText(t.todo);
                      setEditDate(normalizeDate(t.dueDate));
                    }}>
                      <ThemedText style={styles.modalButtonText}>取消</ThemedText>
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.taskItem}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggle(t.id, !t.completed)}
                  >
                    <Ionicons
                      name={t.completed ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={t.completed ? '#4CAF50' : colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                  <View style={styles.taskContent}>
                    <ThemedText style={[styles.todoText, t.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                      {t.todo}
                    </ThemedText>
                    <ThemedText style={styles.dueDate}>截止日期: {normalizeDate(t.dueDate).toLocaleString()}</ThemedText>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={() => {
                      setEditing((prev) => ({ ...prev, [t.id]: true }));
                      setEditText(t.todo);
                      setEditDate(normalizeDate(t.dueDate));
                    }}>
                      <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(t.id)}>
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
            renderItem={renderSection}
            ListHeaderComponent={
              errorMsg ? <ThemedText style={{ color: 'red', textAlign: 'center', padding: 8 }}>{errorMsg}</ThemedText> : null
            }
            ListFooterComponent={
              successMsg ? <ThemedText style={{ color: 'green', textAlign: 'center', padding: 8 }}>{successMsg}</ThemedText> : null
            }
          />
        )}
        {tasks.some((t) => t.completed) && (
          <Button
            mode="contained"
            style={{ margin: 16, backgroundColor: '#E85D75', borderRadius: 6 }}
            onPress={handleClear}
          >
            <ThemedText style={{ color: '#FFFFFF' }}>清理已完成任務</ThemedText>
          </Button>
        )}
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
          <View style={styles.modalContainer}>
            <ThemedView style={styles.modalContent}>
              <ThemedText type="title" style={{ fontSize: 18, marginBottom: 16 }}>新增任務</ThemedText>
              {errorMsg && <ThemedText style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</ThemedText>}
              {successMsg && <ThemedText style={{ color: 'green', marginBottom: 8 }}>{successMsg}</ThemedText>}
              <TextInput
                style={styles.input}
                value={todoText}
                onChangeText={setTodoText}
                placeholder="輸入任務內容"
                multiline
              />
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => showDatePicker(setDueDate, dueDate)}>
                <ThemedText style={styles.dateTimeText}>截止日期: {dueDate.toLocaleString()}</ThemedText>
              </TouchableOpacity>
              <View style={styles.modalButtons}>
                <Button mode="contained" style={styles.addButtonStyle} onPress={handleAdd}>
                  <ThemedText style={styles.modalButtonText}>添加</ThemedText>
                </Button>
                <Button mode="contained" style={styles.cancelButton} onPress={() => {
                  setAddModal(false);
                  setTodoText('');
                  setDueDate(new Date());
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
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: '#383838',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E0E0E0',
  },
  taskContainer: {
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
    color: '#E0E0E0',
    lineHeight: 18,
  },
  dueDate: {
    fontSize: 12,
    color: '#A0A0A0',
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
    borderColor: '#333333',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#2A2A2A',
    color: '#E0E0E0',
  },
  dateTimeButton: {
    padding: 10,
    backgroundColor: '#1A1A1A',
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 0,
    elevation: 3,
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