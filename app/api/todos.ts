// todos.ts
import axios from 'axios';

const API_BASE = 'https://dummyjson.com/todos';

export type Todo = {
  id: string;
  todo: string;
  completed: boolean;
  dueDate: Date;
  userId?: number;
};

export const fetchTodos = async (): Promise<Todo[]> => {
  console.log('Fetching todos...');
  try {
    const { data } = await axios.get(`${API_BASE}`);
    console.log('Todos data:', data.todos);
    
    // Add due dates to todos (since dummyjson doesn't provide them)
    return data.todos.map((todo: any, index: number) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(index / 3));
      return {
        ...todo,
        id: todo.id.toString(),
        dueDate: dueDate,
      };
    });
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    throw error;
  }
};

export const addTodo = async (todoData: Omit<Todo, 'id' | 'completed'>): Promise<Todo> => {
  console.log('Adding todo:', todoData);
  try {
    const payload = {
      todo: todoData.todo,
      completed: false,
      userId: 1,
      dueDate: todoData.dueDate.toISOString(),
    };

    const { data } = await axios.post(`${API_BASE}/add`, payload);
    console.log('Todo added successfully:', data);
    
    return {
      ...data,
      id: data.id.toString(),
      dueDate: new Date(todoData.dueDate),
    };
  } catch (error) {
    console.error('Failed to add todo:', error);
    
    // Fallback for offline mode with unique ID
    const uniqueId = `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      id: uniqueId,
      todo: todoData.todo,
      completed: false,
      userId: 1,
      dueDate: new Date(todoData.dueDate),
    };
  }
};

export const deleteTodo = async (id: string): Promise<void> => {
  console.log(`Deleting todo with id: ${id}`);
  // Skip API call for local todos
  if (id.startsWith('local-')) {
    console.log(`Todo ${id} is local, skipping API call`);
    return;
  }

  try {
    await axios.delete(`${API_BASE}/${id}`);
    console.log(`Todo ${id} deleted successfully`);
  } catch (error) {
    console.error(`Failed to delete todo ${id}:`, error);
    // If 404, assume todo doesn't exist in backend and allow local removal
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`Todo ${id} not found in backend, allowing local deletion`);
      return;
    }
    throw error;
  }
};

export default {
  fetchTodos,
  addTodo,
  deleteTodo,
};