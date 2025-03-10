export const registerUser = async () => {
    try {
        const response = await fetch('http://localhost:5001/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'johndoe',
                email: 'john@example.com',
                password: 'securepassword',
                full_name: 'John Doe'
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        return { error: 'Registration failed' };
    }
};

export const loginUser = async () => {
    try {
        const response = await fetch('http://localhost:5001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'john@example.com',
                password: 'securepassword'
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        return { error: 'Login failed' };
    }
};
