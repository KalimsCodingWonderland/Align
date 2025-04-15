//app/login.js

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert, Animated, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser } from '../constants/api';
import AnimatedInput from '../components/AnimatedInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const AnimatedButton = ({ title, onPress, style }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => {
        Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };
    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={onPress}
                style={style}
            >
                <Text style={styles.buttonText}>{title}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const passwordRef = useRef(null); // Create a ref for the AnimatedInput

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleLogin = async () => {
        try {
            const response = await loginUser(email, password);
            console.log('Login API Response:', response);
            if (response.message && response.token) {
                await AsyncStorage.setItem('token', response.token);
                router.push('/taskManagment');
            } else {
                Alert.alert('Error', response.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login Error:', error);
            Alert.alert('Error', 'Login failed. Please try again.');
        }
    };

    const togglePasswordVisibility = () => {
        setSecureTextEntry(!secureTextEntry);
        //if you have any other complex logic inside animated input, make sure to handle the secureTextEntry change correctly inside that component.
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>🔑 Login</Text>
                <AnimatedInput placeholder="Email" value={email} onChangeText={setEmail} />
                <View style={styles.passwordContainer}>
                    <AnimatedInput
                        ref={passwordRef} // Assign the ref
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                        style={styles.passwordInput}
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={togglePasswordVisibility}>
                        <Ionicons
                            name={secureTextEntry ? 'eye-off' : 'eye'}
                            size={24}
                            color="gray"
                        />
                    </TouchableOpacity>
                </View>
                <AnimatedButton title="Login" onPress={handleLogin} style={styles.button} />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007aff',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#007aff',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginTop: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 5 },
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
    },
    passwordInput: {
        flex: 1,
    },
    eyeButton: {
        padding: 0,
        marginLeft: -20,
    },
});
