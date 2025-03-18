const API_BASE = 'https://align-cvy6.onrender.com';

export const registerUser = async (username: string, email: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Register API Error:', error);
        return { error: 'Registration failed' };
    }
};

export const loginUser = async (email: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Login API Error:', error);
        return { error: 'Login failed' };
    }
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = 'AIzaSyDbUY1_lvjXqjqEq0WAD9kEgd3nB_rArc8';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const categorizeTask = async (task: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Here is what the user inputted: "${task}". Categorize into: Study, Entertainment, Work, Event, Errand, Exercise, Household Chore. Only respond with the category name in uppercase or MANUAL.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();
        const validCategories = ['STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT', 'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE', 'MANUAL'];
        return validCategories.includes(text) ? text : 'MANUAL';
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'MANUAL';
    }
};

export const getTasks = async (token: string) => {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return await response.json();
    } catch (error) {
        console.error('Get Tasks API Error:', error);
        return { error: 'Failed to fetch tasks' };
    }
};

export const addTask = async (task: any, token: string) => {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(task)
        });
        return await response.json();
    } catch (error) {
        console.error('Add Task API Error:', error);
        return { error: 'Failed to add task' };
    }
};

export const updateTask = async (taskId: string, updatedTask: any, token: string) => {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updatedTask)
        });
        return await response.json();
    } catch (error) {
        console.error('Update Task API Error:', error);
        return { error: 'Failed to update task' };
    }
};

export const deleteTask = async (taskId: string, token: string) => {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return await response.json();
    } catch (error) {
        console.error('Delete Task API Error:', error);
        return { error: 'Failed to delete task' };
    }
};
