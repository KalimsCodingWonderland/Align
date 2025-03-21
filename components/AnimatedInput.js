import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { View, TextInput, Animated, StyleSheet } from 'react-native';

const AnimatedInput = forwardRef(({ placeholder, value, onChangeText, secureTextEntry }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

    useEffect(() => {
        Animated.timing(animatedIsFocused, {
            toValue: isFocused || value !== '' ? 1 : 0,
            duration: 200,
            useNativeDriver: false, // Animating layout properties
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        position: 'absolute',
        left: 0,
        top: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
        }),
        fontSize: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: ['#aaa', '#007aff'],
        }),
    };

    return (
        <View style={styles.container}>
            <Animated.Text style={labelStyle}>{placeholder}</Animated.Text>
            <TextInput
                ref={ref} // Forward the ref to the TextInput
                value={value}
                onChangeText={onChangeText}
                style={styles.input}
                secureTextEntry={secureTextEntry}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingTop: 18,
        marginBottom: 20,
        width: '100%',
    },
    input: {
        height: 40,
        fontSize: 16,
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});

export default AnimatedInput;