// constants/api.ts

const API_BASE = 'https://align-cvy6.onrender.com';

export const registerUser = async (
    username: string,
    email: string,
    password: string
) => {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
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
            body: JSON.stringify({ email, password }),
        });
        return await response.json();
    } catch (error) {
        console.error('Login API Error:', error);
        return { error: 'Login failed' };
    }
};

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyDbUY1_lvjXqjqEq0WAD9kEgd3nB_rArc8'; // Replace with your actual key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const parseTaskDetails = async (task: string) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        // Include today's date in the prompt and instruct to use it for relative dates.
        const prompt = `TODAY'S DATE IS: ${todayDate}.
Extract details from the following task input and return them in a single line string in the format "CATEGORY|SCHEDULED_DATE|SCHEDULED_TIME|DURATION". 
- CATEGORY should be one of: STUDY, ENTERTAINMENT, WORK, EVENT, ERRAND, EXERCISE, HOUSEHOLD CHORE (in uppercase) or MANUAL.
- SCHEDULED_DATE should be in YYYY-MM-DD format. If the task input does not explicitly specify a year, assume the current year (${currentYear}). 
- If a relative date (e.g., "tomorrow") is mentioned, calculate the correct absolute date based on today's date.
- SCHEDULED_TIME should be in HH:MM (24-hour) format (if not provided, use "12:00").
- DURATION should be a string (e.g., "4 hours", "2 hours") (if not provided, use "DEFAULT").
Task: "${task}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        // Expecting format: CATEGORY|YYYY-MM-DD|HH:MM|DURATION
        const parts = text.split('|');
        if (parts.length < 4) {
            throw new Error('Invalid response format');
        }
        const category = parts[0].trim().toUpperCase();
        let scheduled_date = parts[1].trim();
        const scheduled_time = parts[2].trim();
        const duration = parts[3].trim();

        // Post-process the date: if the returned scheduled_date has a year other than current but looks like it should be relative,
        // update the year to the current year.
        let scheduledDateObj = new Date(scheduled_date + 'T00:00:00');
        if (scheduledDateObj.getFullYear() !== currentYear) {
            // If the extracted date is before today but the month/day suggests it should be in the future,
            // then update the year.
            if (scheduledDateObj < today) {
                const [ , month, day ] = scheduled_date.split('-');
                scheduled_date = `${currentYear}-${month}-${day}`;
            }
        }
        return { category, scheduled_date, scheduled_time, duration };
    } catch (error) {
        console.error('Parse Task Details API Error:', error);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = (today.getMonth() + 1).toString().padStart(2, '0');
        const dd = today.getDate().toString().padStart(2, '0');
        return {
            category: 'MANUAL',
            scheduled_date: `${yyyy}-${mm}-${dd}`,
            scheduled_time: '12:00',
            duration: '30 min',
        };
    }
};

export const parseImageTasks = async (imageBase64: string) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const todayDate = today.toISOString().split('T')[0];
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `Carefully analyze this image of a handwritten weekly schedule. Extract all tasks with their dates, times, and durations. Format each task as:
    "Task: [description] | Date: YYYY-MM-DD | Time: HH:MM | Duration: X minutes X hours"
    
    Follow these rules:
    1. Convert all dates to ISO format (YYYY-MM-DD) 
    2. Use 24-hour time format
    3. If time isn't specified, assume 12:00 PM
    4. If date isn't specified, assume ${todayDate}.
    5. If duration isn't specified, estimate based on context
    6. Handle abbreviations (e.g., 'math hw' → 'math homework')
    
    Example:
    "Task: Team meeting | Date: 2024-03-20 | Time: 14:30 | Duration: 1 hour"`;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg',
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        return text.split('\n').filter(t => t.trim());
    } catch (error) {
        console.error('Image processing error:', error);
        return [];
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
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(task),
        });
        return await response.json();
    } catch (error) {
        console.error('Add Task API Error:', error);
        return { error: 'Failed to add task' };
    }
};

export const updateTask = async (
    taskId: string,
    updatedTask: any,
    token: string
) => {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedTask),
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
