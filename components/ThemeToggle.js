//components/ThemeToggle.js

import React, {useRef} from 'react';
import {TouchableOpacity, Animated, StyleSheet, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../app/ThemeContext';

const TRACK_W = 56, TRACK_H = 32, KNOB = 28, PAD = 2;

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const anim = useRef(new Animated.Value(theme.mode === 'dark' ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.spring(anim, { toValue: theme.mode === 'dark' ? 1 : 0, useNativeDriver: false }).start();
    }, [theme.mode]);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [PAD, TRACK_W - KNOB - PAD],
    });

    const trackColor = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#d1d1d6', theme.primary],
    });

    const sunOpacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    const moonOpacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={toggleTheme}>
            <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
                <Animated.View style={[styles.knob, { transform: [{ translateX }] }]}>
                    <View style={styles.iconWrap}>
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sunOpacity, alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="sunny" size={16} color="#f1c40f" />
                        </Animated.View>
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: moonOpacity, alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="moon" size={16} color="#8e44ad" />
                        </Animated.View>
                    </View>
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    track:{width:TRACK_W,height:TRACK_H,borderRadius:TRACK_H/2,justifyContent:'center'},
    knob :{width:KNOB,height:KNOB,borderRadius:KNOB/2,backgroundColor:'#fff',elevation:3},
    iconWrap:{flex:1,alignItems:'center',justifyContent:'center'}
});
