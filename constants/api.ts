// constants/api.ts

const API_BASE = 'https://align-cvy6.onrender.com';

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyDbUY1_lvjXqjqEq0WAD9kEgd3nB_rArc8'; // Replace with your actual key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const parseTaskDetails = async (task: any) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const todayDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `TODAY'S DATE IS: ${todayDate}.
Extract task details and return them in this format:
"CATEGORY|SCHEDULED_DATE|SCHEDULED_TIME|DURATION|RECURRENCE"

RULES:
- CATEGORY: One of STUDY, ENTERTAINMENT, WORK, EVENT, ERRAND, EXERCISE, HOUSEHOLD CHORE (uppercase) or MANUAL. (NO ''' JSON - NEVER INCLUDE THIS)
- SCHEDULED_DATE: Use YYYY-MM-DD. If no year is given, assume ${currentYear}. For relative terms like "tomorrow", use ${todayDate} as a reference.
- SCHEDULED_TIME: Use 24-hour HH:MM format. If not given, default to "12:00".
- DURATION: String like "1 hour", "30 min". If not given, use "DEFAULT".
- RECURRENCE: 
   - If recurring, return a string with:
     {
       "type": "daily" | "weekly" | "monthly" | "yearly",
       "daysOfWeek": [optional, for weekly recurrence: 0=Sun, 1=Mon, ..., 6=Sat],
       "interval": number (default 1),
       "endType": "never" | "date" | "count",
       "endDate": "YYYY-MM-DD" (if applicable)(add 1 day),
       "occurrences": number (if applicable)
     }
   - If not recurring, use "none"

Example:
WORK|2025-03-22|09:00|1 hour|{"type":"weekly","daysOfWeek":[1,3],"interval":1,"endType":"never"}

Task: "${task}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        const parts = text.split('|');
        if (parts.length < 5) {
            throw new Error('Invalid response format');
        }

        const category = parts[0].trim().toUpperCase();
        let scheduled_date = parts[1].trim();
        const scheduled_time = parts[2].trim();
        const duration = parts[3].trim();
        const recurrenceRaw = parts[4].trim();

        let recurrence;
        if (recurrenceRaw.toLowerCase() === 'none') {
            recurrence = { type: 'none' };
        } else {
            try {
                recurrence = JSON.parse(recurrenceRaw);
            } catch (e) {
                recurrence = { type: 'none' };
            }
        }

        // Adjust year if needed
        let scheduledDateObj = new Date(scheduled_date + 'T00:00:00');
        if (scheduledDateObj.getFullYear() !== currentYear && scheduledDateObj < today) {
            const [, month, day] = scheduled_date.split('-');
            scheduled_date = `${currentYear}-${month}-${day}`;
        }

        return { category, scheduled_date, scheduled_time, duration, recurrence };
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
            recurrence: { type: 'none' }
        };
    }
};

// constants/api.ts - Update parseImageTasks function
export const parseImageTasks = async (imageBase64: any) => {
    try {
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0];
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `TODAY'S DATE IS: ${todayDate}.
You are given an image of a handwritten schedule. Extract **each task** and output it as a **single line** in this format:

Task: [description] | Date: YYYY-MM-DD | Time: HH:MM | Duration: [natural language duration] | Recurrence: [string or "none"]

STRICT RULES:
3. Each task must be on a separate line — exactly one line per task.
4. Dates should be in YYYY-MM-DD format. If not specified, use today’s date (${todayDate}).
5. Time must be 24-hour HH:MM format. If not specified, use "12:00".
6. Duration must be human-readable like "1 hour 30 minutes" or "45 minutes".
7. Recurrence must be:
   - "none" if not recurring
   - A valid string if recurring, e.g., {"type":"weekly","daysOfWeek":[1,3],"interval":1,"endType":"never"}

Example output:
Task: Chemistry Class | Date: 2025-03-23 | Time: 10:30 | Duration: 1 hour 15 min | Recurrence: {"type":"weekly","daysOfWeek":[2,4],"interval":1,"endType":"never"}
Task: Yoga | Date: 2025-03-23 | Time: 18:00 | Duration: 45 min | Recurrence: none
`;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg',
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().trim();

        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('Task:')); // ensure only task lines are returned
    } catch (error) {
        console.error('Image processing error:', error);
        return [];
    }
};

// The remaining API functions remain unchanged.
export const registerUser = async (username: any, email: any, password: any) => {
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

export const loginUser = async (email: any, password: any) => {
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

export const getTasks = async (token: any) => {
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

export const addTask = async (task: any, token: any) => {
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

export const updateTask = async (taskId: any, updatedTask: any, token: any) => {
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

export const deleteTask = async (taskId: any, token: any) => {
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
