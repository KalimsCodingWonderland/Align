//app/ThemeContext.js

import React, {createContext, useContext, useEffect, useState, useMemo} from 'react';
import {Appearance} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
    mode: 'light',
    background: '#f5f6fa',
    card:        '#ffffff',
    text:        '#1c1c1e',
    subText:     '#6c6c6e',
    primary:     '#007aff',
    danger:      '#ff3b30',
};

export const darkTheme = {
    mode: 'dark',
    background: '#000000',
    card:        '#1c1c1e',
    text:        '#f5f6fa',
    subText:     '#8e8e93',
    primary:     '#0a84ff',
    danger:      '#ff453a',
};

const ThemeContext = createContext({
    theme: lightTheme,
    toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({children}) => {
    const [theme, setTheme]   = useState(lightTheme);

    // 1️⃣  Pick OS default on first run
    useEffect(() => {
        (async () => {
            const stored = await AsyncStorage.getItem('appTheme');
            if (stored === 'light' || stored === 'dark') {
                setTheme(stored === 'light' ? lightTheme : darkTheme);
            } else {
                const sys = Appearance.getColorScheme();
                setTheme(sys === 'dark' ? darkTheme : lightTheme);
            }
        })();
    }, []);

    // 2️⃣  Toggle + persist
    const toggleTheme = async () => {
        const next = theme.mode === 'light' ? darkTheme : lightTheme;
        setTheme(next);
        await AsyncStorage.setItem('appTheme', next.mode);
    };

    const value = useMemo(() => ({theme, toggleTheme}), [theme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
