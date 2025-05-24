// app/userAuth.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter }   from 'expo-router';
import { useTheme }    from './ThemeContext';

const createStyles = (t) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    title: {
        left: 70,
        alignSelf: 'flex-start',
        fontSize: 45,
        fontWeight: '700',
        color: t.text,
        marginBottom: 40,
    },
    button: {
        backgroundColor: t.primary,
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


const AnimatedButton = ({ title, onPress, style, textStyle }) => {
    const scale = useRef(new Animated.Value(1)).current;
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={() => Animated.spring(scale,{toValue:0.95,useNativeDriver:true}).start()}
                onPressOut={() => Animated.spring(scale,{toValue:1,friction:3,useNativeDriver:true}).start()}
                onPress={onPress}
                style={style}
            >
                <Text style={textStyle}>{title}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function HomeScreen() {
    const { theme } = useTheme();
    const styles     = React.useMemo(() => createStyles(theme), [theme]);

    const router   = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim,{toValue:1,duration:800,useNativeDriver:true}).start();
    }, []);

    return (
        <Animated.View style={[styles.container,{opacity:fadeAnim}]}>
            <Text style={styles.title}>Set Your Schedule Straight.</Text>

            <AnimatedButton
                title="Register"
                onPress={() => router.push('/register')}
                style={styles.button}
                textStyle={styles.buttonText}
            />

            <AnimatedButton
                title="Login"
                onPress={() => router.push('/login')}
                style={styles.button}
                textStyle={styles.buttonText}
            />
        </Animated.View>
    );
}
