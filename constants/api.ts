const API_BASE = 'http://localhost:5001'; // Change for Android if needed

export const registerUser = async (username: string, email: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        return await response.json(); // Returns API response
    } catch (error) {
        console.error('Register API Error:', error);
        return { error: 'Registration failed' }; // Ensures a valid return value
    }
};

export const loginUser = async (email: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        return await response.json(); // Returns API response
    } catch (error) {
        console.error('Login API Error:', error);
        return { error: 'Login failed' }; // Ensures a valid return value
    }
};
