//constants/api.ts

const API_BASE =  'https://align-git-kalimbranch-kalims-projects-52343af1.vercel.app/';


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

// constants/api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = 'AIzaSyDbUY1_lvjXqjqEq0WAD9kEgd3nB_rArc8'; // Replace with your actual key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const categorizeTask = async (task: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Here is what the user inputted: "${task}". Categorize into: Study, Entertainment, Work, Event, Errand, Exercise, Household Chore. Only respond with the category name in uppercase or MANUAL.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();

        // Validate response
        const validCategories = ['STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT',
            'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE', 'MANUAL'];

        return validCategories.includes(text) ? text : 'MANUAL';

    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'MANUAL';
    }
};
