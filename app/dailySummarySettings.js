// app/dailySummarySettings.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync, cancelDailySummaryNotification, scheduleDailySummaryNotification } from '../constants/notifications';
import { styles as globalStyles } from './styles';

export default function dailySummarySettings() {
    const router = useRouter();
    const [reminderTime, setReminderTime] = useState("09:00"); // default time
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        // Load saved settings from AsyncStorage on mount.
        const loadSettings = async () => {
            const storedTime = await AsyncStorage.getItem('dailySummaryReminderTime');
            const storedEnabled = await AsyncStorage.getItem('dailySummaryEnabled');
            if (storedTime) setReminderTime(storedTime);
            if (storedEnabled) setEnabled(storedEnabled === 'true');
        };
        loadSettings();
        registerForPushNotificationsAsync();
    }, []);

    const onChangeTime = (event, selectedDate) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setReminderTime(`${hours}:${minutes}`);
        }
    };

    const toggleEnabled = () => {
        setEnabled((prev) => !prev);
    };

    const handleSave = async () => {
        await AsyncStorage.setItem('dailySummaryReminderTime', reminderTime);
        await AsyncStorage.setItem('dailySummaryEnabled', enabled ? 'true' : 'false');
        // Cancel any previously scheduled daily summary notification.
        await cancelDailySummaryNotification();
        if (enabled) {
            // For demonstration, we assume a fixed tasks count (e.g. 5).
            // In a full implementation you would calculate today’s tasks count.
            const tasksCount = 5;
            await scheduleDailySummaryNotification(reminderTime, tasksCount);
        }
        Alert.alert("Settings Saved", "Daily summary reminder settings updated.", [
            { text: "OK", onPress: () => router.back() }
        ]);
    };

    return (
        <View style={globalStyles.container}>
            <Text style={globalStyles.modalTitle}>Daily Summary Reminder Settings</Text>
            <TouchableOpacity style={globalStyles.selectionButton} onPress={() => setShowTimePicker(true)}>
                <Text style={globalStyles.selectionButtonText}>Reminder Time: {reminderTime}</Text>
                <Text style={globalStyles.selectionButtonIcon}>⌄</Text>
            </TouchableOpacity>
            {showTimePicker && (
                <DateTimePicker
                    value={new Date(0, 0, 0, parseInt(reminderTime.split(':')[0]), parseInt(reminderTime.split(':')[1]))}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={onChangeTime}
                />
            )}
            <View style={localStyles.toggleContainer}>
                <Text style={localStyles.toggleLabel}>Enable Daily Summary</Text>
                <TouchableOpacity onPress={toggleEnabled} style={[localStyles.toggleButton, { backgroundColor: enabled ? 'green' : 'grey' }]}>
                    <Text style={localStyles.toggleButtonText}>{enabled ? "On" : "Off"}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={[globalStyles.addTaskButton, localStyles.saveButton]} onPress={handleSave}>
                <Text style={globalStyles.addTaskButtonText}>Save Settings</Text>
            </TouchableOpacity>
        </View>
    );
}

const localStyles = StyleSheet.create({
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    toggleButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    toggleButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    saveButton: {
        marginTop: 20,
    },
});
