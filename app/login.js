// app/login.js
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Alert,
    Animated,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser } from '../constants/api';
import AnimatedInput from '../components/AnimatedInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

/* ────────────────────────────────────
   Themed stylesheet factory
──────────────────────────────────── */
const createStyles = (t) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: t.background,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        backButton: { position: 'absolute', top: 50, left: 20 },
        backButtonText: { fontSize: 16, color: t.primary },
        title: { fontSize: 28, fontWeight: '700', color: t.text, marginBottom: 30 },
        button: {
            backgroundColor: t.primary,
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
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            marginBottom: 10,
        },
        passwordInput: { flex: 1 },
        eyeButton: { padding: 0, marginLeft: -20 },
    });

/* ────────────────────────────────────
   Re-usable animated button
──────────────────────────────────── */
const AnimatedButton = ({ title, onPress, style, textStyle }) => {
    const scale = useRef(new Animated.Value(1)).current;
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
                onPress={onPress}
                style={style}
            >
                <Text style={textStyle}>{title}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

/* ────────────────────────────────────
   Screen component
──────────────────────────────────── */
export default function LoginScreen() {
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const passwordRef = useRef(null);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, []);

    const handleLogin = async () => {
        try {
            const response = await loginUser(email, password);
            if (response.message && response.token) {
                await AsyncStorage.setItem('token', response.token);
                router.push('/taskManagment');
            } else {
                Alert.alert('Error', response.error || 'Invalid credentials');
            }
        } catch (err) {
            Alert.alert('Error', 'Login failed. Please try again.');
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>🔑 Login</Text>

                <AnimatedInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    textInputStyle={{ color: theme.text }}  // 👈 makes typed text theme-colored
                />

                <View style={styles.passwordContainer}>
                    <AnimatedInput
                        ref={passwordRef}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                        textInputStyle={{ color: theme.text }}  // 👈 applies here too
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setSecureTextEntry(!secureTextEntry)}>
                        <Ionicons name={secureTextEntry ? 'eye-off' : 'eye'} size={24} color={theme.subText} />
                    </TouchableOpacity>
                </View>

                <AnimatedButton
                    title="Login"
                    onPress={handleLogin}
                    style={styles.button}
                    textStyle={styles.buttonText}
                />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}
