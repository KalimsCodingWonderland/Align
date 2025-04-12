// app/dailySummarySettings.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, StyleSheet, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync, cancelDailySummaryNotification, scheduleDailySummaryNotification } from '../constants/notifications';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const twelveHours = hours % 12 || 12;
    return `${twelveHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

export default function DailySummarySettings() {
    const router = useRouter();
    const [reminderTime, setReminderTime] = useState("09:00");
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
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

    const handleSave = async () => {
        await AsyncStorage.setItem('dailySummaryReminderTime', reminderTime);
        await AsyncStorage.setItem('dailySummaryEnabled', enabled ? 'true' : 'false');
        await cancelDailySummaryNotification();

        if (enabled) {
            await scheduleDailySummaryNotification(reminderTime);
            // Schedule demo notification

        }

        Alert.alert("Settings Saved", "Daily summary settings updated. A demo notification will appear above.", [
            { text: "OK", onPress: () => router.back() }
        ]);
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={100} tint="light" style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Reminder</Text>
            </BlurView>

            <View style={styles.content}>
                <Text style={styles.description}>
                    Set your preferred time for the daily schedule summary. Once saved, a demo notification will
                    appear above. Tap daily notifications to jump directly to that day's calendar.
                </Text>

                <View style={styles.settingRow}>
                    <Ionicons name="notifications-outline" size={22} color="#007AFF" />
                    <View style={styles.settingDetails}>
                        <Text style={styles.settingTitle}>Daily Reminder</Text>
                        <TouchableOpacity
                            style={styles.timePickerButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={styles.timePickerText}>{formatTime(reminderTime)}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>
                    <Switch
                        value={enabled}
                        onValueChange={setEnabled}
                        trackColor={{ false: "#767577", true: "#007AFF" }}
                        thumbColor="#FFFFFF"
                    />
                </View>

                {showTimePicker && (
                    <DateTimePicker
                        value={new Date(0, 0, 0, ...reminderTime.split(':').map(Number))}
                        mode="time"
                        is24Hour={true}
                        display="spinner"
                        onChange={onChangeTime}
                        style={styles.timePicker}
                    />
                )}

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    content: {
        padding: 20,
    },
    description: {
        fontSize: 15,
        color: '#636366',
        lineHeight: 22,
        marginBottom: 30,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    settingDetails: {
        flex: 1,
        marginLeft: 12,
    },
    settingTitle: {
        fontSize: 16,
        color: '#1C1C1E',
        fontWeight: '500',
        marginBottom: 4,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timePickerText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    timePicker: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
    },
});
