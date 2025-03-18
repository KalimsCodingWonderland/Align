// app/userAuth.js

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

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

export default function HomeScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Set Your Schedule Straight.</Text>
            <AnimatedButton title="Register" onPress={() => router.push('/register')} style={styles.button} />
            <AnimatedButton title="Login" onPress={() => router.push('/login')} style={styles.button} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    title: {
        fontSize: 45,
        fontWeight: '700',
        color: '#333',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#007aff',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginVertical: 10,
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
});
