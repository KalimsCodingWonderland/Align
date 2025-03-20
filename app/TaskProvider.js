import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTasks, addTask, updateTask, deleteTask } from '../constants/api';

// Create the Context
const TaskContext = createContext(null);

// Custom hook to access the TaskContext
export function useTasks() {
    return useContext(TaskContext);
}

// The provider component
export function TaskProvider({ children }) {
    const [tasks, setTasks] = useState([]);
    const [token, setToken] = useState(null);

    // Load the token from AsyncStorage once on mount
    useEffect(() => {
        (async () => {
            try {
                const storedToken = await AsyncStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                }
            } catch (error) {
                console.error('Failed to load token from AsyncStorage:', error);
            }
        })();
    }, []);

    // Fetch tasks from the API and store them in context
    const fetchTasks = useCallback(async () => {
        if (!token) return;
        try {
            const tasksFromApi = await getTasks(token);
            if (Array.isArray(tasksFromApi)) {
                setTasks(tasksFromApi);
            } else {
                console.error('fetchTasks error:', tasksFromApi.error);
            }
        } catch (error) {
            console.error('fetchTasks exception:', error);
        }
    }, [token]);

    // Call fetchTasks whenever token changes
    useEffect(() => {
        if (token) {
            fetchTasks();
        }
    }, [token, fetchTasks]);

    // Add a new task to the DB and to our context
    const addNewTask = async (newTask) => {
        if (!token) return null;
        try {
            const result = await addTask(newTask, token);
            if (result._id) {
                // Insert into our local state
                setTasks((prev) => [...prev, result]);
                return result;
            } else {
                console.error('addNewTask error:', result.error);
                return null;
            }
        } catch (error) {
            console.error('addNewTask exception:', error);
            return null;
        }
    };

    // Update an existing task
    const updateExistingTask = async (taskId, updated) => {
        if (!token) return null;
        try {
            const result = await updateTask(taskId, updated, token);
            if (result._id) {
                setTasks((prevTasks) =>
                    prevTasks.map((t) => (t._id === result._id ? result : t))
                );
                return result;
            } else {
                console.error('updateExistingTask error:', result.error);
                return null;
            }
        } catch (error) {
            console.error('updateExistingTask exception:', error);
            return null;
        }
    };

    // Delete an existing task
    const deleteExistingTask = async (taskId) => {
        if (!token) return false;
        try {
            const result = await deleteTask(taskId, token);
            if (result.success) {
                setTasks((prevTasks) => prevTasks.filter((t) => t._id !== taskId));
                return true;
            } else {
                console.error('deleteExistingTask error:', result.error);
                return false;
            }
        } catch (error) {
            console.error('deleteExistingTask exception:', error);
            return false;
        }
    };

    /**
     * Called by paperImport.js after tasks are successfully imported/added
     * to the DB so we can refresh or incorporate them.
     * If you want to fetch again from the server, just do fetchTasks().
     * Or if you already have the newly created tasks, you can push them
     * into state manually. This example just calls fetchTasks() for
     * guaranteed correctness.
     */
    const importTasksFromPaper = async () => {
        await fetchTasks();  // Re-fetch tasks from server to ensure all are up to date
    };

    const value = {
        token,
        tasks,
        fetchTasks,
        addNewTask,
        updateExistingTask,
        deleteExistingTask,
        importTasksFromPaper,
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
}
