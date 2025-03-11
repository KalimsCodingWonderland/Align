import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { loginUser } from '../constants/api';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const response = await loginUser(email, password);
            console.log('Login API Response:', response); // ✅ Debugging log
    
            if (response.message) {
                Alert.alert('Success', response.message);
                router.push('/calendar'); // ✅ Navigate to calendar
            } else {
                Alert.alert('Error', response.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login Error:', error); // ✅ Log any API call errors
            Alert.alert('Error', 'Login failed. Please try again.');
        }
    };
    

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <Text>🔑 Login</Text>
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <Button title="Login" onPress={handleLogin} />
        </View>
    );
}
