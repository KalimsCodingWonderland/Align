import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function CalendarScreen() {
    const router = useRouter();

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Calendar Screen</Text>
        </View>
    );
}