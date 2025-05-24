// app/dailySummarySettings.js
import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Alert, Platform, StyleSheet, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
    registerForPushNotificationsAsync,
    cancelDailySummaryNotification,
    scheduleDailySummaryNotification,
} from '../constants/notifications';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from './ThemeContext';          // ⬅️ NEW

/* ───────── helpers ───────── */
const formatTime = (time) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const twelve = h % 12 || 12;
    return `${twelve}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/* ───────── component ───────── */
export default function DailySummarySettings() {
    const { theme } = useTheme();                    // ⬅️ THEME
    const isDark   = theme.mode === 'dark';
    const fg       = (l, d = l) => (isDark ? d : l); // quick helper

    const router = useRouter();

    const [reminderTime, setReminderTime] = useState('09:00');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        (async () => {
            const t = await AsyncStorage.getItem('dailySummaryReminderTime');
            const e = await AsyncStorage.getItem('dailySummaryEnabled');
            if (t) setReminderTime(t);
            if (e) setEnabled(e === 'true');
        })();
        registerForPushNotificationsAsync();
    }, []);

    const onChangeTime = (_, selectedDate) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const h = selectedDate.getHours().toString().padStart(2, '0');
            const m = selectedDate.getMinutes().toString().padStart(2, '0');
            setReminderTime(`${h}:${m}`);
        }
    };

    const handleSave = async () => {
        await AsyncStorage.setItem('dailySummaryReminderTime', reminderTime);
        await AsyncStorage.setItem('dailySummaryEnabled', enabled ? 'true' : 'false');
        await cancelDailySummaryNotification();
        if (enabled) await scheduleDailySummaryNotification(reminderTime);
        Alert.alert(
            'Settings Saved',
            'Daily summary settings updated.',
            [{ text: 'OK', onPress: () => router.back() }],
        );
    };

    /* ───────── UI ───────── */
    return (
        <View style={[local.container, { backgroundColor: fg('#F2F2F7', '#000') }]}>
            {/* translucent header */}
            <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={100}
                style={[local.header, { borderBottomColor: fg('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.08)') }]}
            >
                <TouchableOpacity onPress={router.back} style={local.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={[local.headerTitle, { color: fg('#1C1C1E', '#F5F5F5') }]}>
                    Daily Reminder
                </Text>
            </BlurView>

            <View style={local.content}>
                <Text style={[local.description, { color: fg('#636366', '#A6A6AA') }]}>
                    Set your preferred time for the daily schedule summary. Once saved, a demo notification will
                    appear above. Tap daily notifications to jump directly to that day's calendar.
                </Text>

                {/* Setting row */}
                <View
                    style={[
                        local.settingRow,
                        {
                            backgroundColor: fg('#FFFFFF', '#1A1A1C'),
                            shadowColor: isDark ? '#000' : '#000', // keep subtle shadow
                        },
                    ]}
                >
                    <Ionicons name="notifications-outline" size={22} color={theme.primary} />
                    <View style={local.settingDetails}>
                        <Text style={[local.settingTitle, { color: fg('#1C1C1E', '#F5F5F5') }]}>
                            Daily Reminder
                        </Text>
                        <TouchableOpacity
                            style={local.timePickerButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={[local.timePickerText, { color: theme.primary }]}>
                                {formatTime(reminderTime)}
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color={fg('#8E8E93', '#8E8E93')} />
                        </TouchableOpacity>
                    </View>
                    <Switch
                        value={enabled}
                        onValueChange={setEnabled}
                        trackColor={{ false: fg('#767577', '#4d4d4f'), true: theme.primary }}
                        thumbColor={isDark ? '#1c1c1e' : '#FFFFFF'}
                    />
                </View>

                {showTimePicker && (
                    <DateTimePicker
                        value={new Date(0, 0, 0, ...reminderTime.split(':').map(Number))}
                        mode="time"
                        display="spinner"
                        is24Hour
                        onChange={onChangeTime}
                        style={[
                            local.timePicker,
                            { backgroundColor: fg('#FFFFFF', '#1A1A1C') },
                        ]}
                    />
                )}

                <TouchableOpacity
                    style={[local.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                >
                    <Text style={local.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

/* ───────── local styles ───────── */
const local = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: '600' },

    content: { padding: 20 },
    description: { fontSize: 15, lineHeight: 22, marginBottom: 30 },

    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    settingDetails: { flex: 1, marginLeft: 12 },
    settingTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },

    timePickerButton: { flexDirection: 'row', alignItems: 'center' },
    timePickerText: { fontSize: 16, fontWeight: '500' },

    timePicker: {
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },

    saveButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
