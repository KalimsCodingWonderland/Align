import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { registerUser, loginUser } from '../../constants/api'; // Import API functions

export default function HomeScreen() {
    const [message, setMessage] = useState('');

    const handleRegister = async () => {
        const response = await registerUser();
        setMessage(response.message || response.error);
    };

    const handleLogin = async () => {
        const response = await loginUser();
        setMessage(response.message || response.error);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Home Screen</Text>
            <Button title="Register User" onPress={handleRegister} />
            <Button title="Login User" onPress={handleLogin} />
            {message && <Text>{message}</Text>}
        </View>
    );
}
