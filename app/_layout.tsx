import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from './ThemeContext';
import { View } from 'react-native';

// A wrapper to access the theme inside the layout
function ThemedStack() {
    const { theme } = useTheme();

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: theme.background, // 🛠️ fixes white flash
                    },
                }}
            />
        </View>
    );
}

export default function Layout() {
    return (
        <ThemeProvider>
            <ThemedStack />
        </ThemeProvider>
    );
}
