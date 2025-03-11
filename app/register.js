import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { registerUser } from '../constants/api';

export default function RegisterScreen() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async () => {
        const response = await registerUser(username, email, password);
        if (response.message) {
            Alert.alert('Success', response.message);
            router.push('/login');
        } else {
            Alert.alert('Error', response.error);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <Text>📝 Register</Text>
            <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <Button title="Register" onPress={handleRegister} />
        </View>
    );
}
