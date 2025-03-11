const API_BASE =  'http://10.190.66.171:5001';


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
