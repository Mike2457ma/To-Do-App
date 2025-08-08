import axios from 'axios';

const API_BASE = 'https://dummyjson.com/todos';

type Todo = {
  id: number;
  todo: string;
  completed: boolean;
  dueDate: Date; // 統一為 Date 類型
  userId?: number;
};

export const fetchTodos = async (): Promise<Todo[]> => {
  console.log('正在獲取待辦事項...');
  try {
    const { data } = await axios.get(`${API_BASE}`);
    console.log('待辦事項數據:', data.todos);
    return data.todos.map((todo: any, index: number) => {
      const daysToAdd = Math.floor(index / 3);
      const dueDate = new Date(); // 保留當前時間
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      return {
        ...todo,
        dueDate: dueDate,
      };
    });
  } catch (error) {
    console.error('獲取待辦事項失敗:', error);
    throw error;
  }
};

export const addTodo = async (text: string, dueDate: Date): Promise<Todo> => {
  console.log('正在添加待辦事項:', { text, dueDate });
  try {
    const dueDateStr = dueDate.toISOString(); // 將 Date 轉為 ISO 字符串
    const { data } = await axios.post(`${API_BASE}/add`, {
      todo: text,
      completed: false,
      userId: 1,
      dueDate: dueDateStr, // 嘗試傳遞 dueDate
    });
    console.log('添加待辦事項成功:', data);
    return { ...data, dueDate: new Date(dueDateStr) }; // 返回 Date 物件
  } catch (error) {
    console.error('添加待辦事項失敗:', error);
    return {
      id: Math.floor(Math.random() * 10000),
      todo: text,
      completed: false,
      userId: 1,
      dueDate: dueDate, // 失敗時使用傳入的 Date
    };
  }
};

export default {
  fetchTodos,
  addTodo,
};