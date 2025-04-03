// app/alignSleep.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform, // Import Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons'; // For back button icon
import { styles as globalStyles } from './styles'; // Import global styles

// Helper to format Date object to HH:MM string
const formatTimeToHHMM = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Helper to format HH:MM string to displayable time (e.g., 7:00 AM)
const formatDisplayTime = (hhmm) => {
    if (!hhmm) return 'Not Set';
    const [h, m] = hhmm.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Helper to create a Date object from HH:MM string for the picker
const createDateFromHHMM = (hhmm) => {
    const date = new Date();
    if (hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        date.setHours(h, m, 0, 0);
    } else {
        // Default to a sensible time if not set
        if (hhmm === '23:00') date.setHours(23, 0, 0, 0); // Default Bedtime
        else date.setHours(7, 0, 0, 0); // Default Wake Time
    }
    return date;
};

export default function AlignSleepScreen() {
    const router = useRouter();
    const [bedtime, setBedtime] = React.useState(null); // Stores HH:MM string
    const [wakeTime, setWakeTime] = React.useState(null); // Stores HH:MM string

    const [pickerDate, setPickerDate] = React.useState(new Date()); // Temp date for picker
    const [showPicker, setShowPicker] = React.useState(false);
    const [pickerMode, setPickerMode] = React.useState('bedtime'); // 'bedtime' or 'wakeTime'

    // Load saved times on mount
    React.useEffect(() => {
        const loadSleepSchedule = async () => {
            const savedBedtime = await AsyncStorage.getItem('bedtimeTime');
            const savedWakeTime = await AsyncStorage.getItem('wakeTime');
            setBedtime(savedBedtime || '23:00'); // Default 11 PM
            setWakeTime(savedWakeTime || '07:00'); // Default 7 AM
        };
        loadSleepSchedule();
    }, []);

    const onChangePicker = (event, selectedDate) => {
        setShowPicker(Platform.OS === 'ios'); // Keep picker open on iOS until explicitly closed
        if (selectedDate) {
            const formattedTime = formatTimeToHHMM(selectedDate);
            if (pickerMode === 'bedtime') {
                setBedtime(formattedTime);
            } else {
                setWakeTime(formattedTime);
            }
            // Update pickerDate state to reflect selection immediately on Android
            if (Platform.OS !== 'ios') {
                setPickerDate(selectedDate);
            }
        }
    };

    const showTimePicker = (mode) => {
        setPickerMode(mode);
        // Set the picker's initial value based on the current state or default
        const initialTime = mode === 'bedtime' ? bedtime : wakeTime;
        setPickerDate(createDateFromHHMM(initialTime));
        setShowPicker(true);
    };

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem('bedtimeTime', bedtime);
            await AsyncStorage.setItem('wakeTime', wakeTime);
            Alert.alert('Success', 'Sleep schedule saved!', [
                { text: 'OK', onPress: () => router.back() } // Go back after saving
            ]);
        } catch (e) {
            console.error("Failed to save sleep schedule:", e);
            Alert.alert('Error', 'Could not save sleep schedule.');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: 60 }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
            </TouchableOpacity>

            <Text style={styles.title}>Align Sleep Schedule</Text>
            <Text style={styles.subtitle}>
                Set your regular sleep times. Align will use this to help avoid scheduling tasks during your sleep hours and find better times with Smart Align.
            </Text>

            <View style={styles.timeSelectorContainer}>
                <Text style={styles.label}>Bedtime</Text>
                <TouchableOpacity
                    style={globalStyles.selectionButton} // Use consistent button style
                    onPress={() => showTimePicker('bedtime')}
                >
                    <Text style={globalStyles.selectionButtonText}>
                        {formatDisplayTime(bedtime)}
                    </Text>
                    <Text style={globalStyles.selectionButtonIcon}>⌄</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.timeSelectorContainer}>
                <Text style={styles.label}>Wake-up Time</Text>
                <TouchableOpacity
                    style={globalStyles.selectionButton} // Use consistent button style
                    onPress={() => showTimePicker('wakeTime')}
                >
                    <Text style={globalStyles.selectionButtonText}>
                        {formatDisplayTime(wakeTime)}
                    </Text>
                    <Text style={globalStyles.selectionButtonIcon}>⌄</Text>
                </TouchableOpacity>
            </View>

            {showPicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={pickerDate}
                    mode="time"
                    is24Hour={false} // Use AM/PM
                    display="spinner" // Or "default", "clock", "spinner"
                    onChange={onChangePicker}
                />
            )}
            {/* Optional: Add a button to close picker on iOS if needed */}
            {Platform.OS === 'ios' && showPicker && (
                <TouchableOpacity style={styles.doneButton} onPress={() => setShowPicker(false)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[globalStyles.addTaskButton, styles.saveButton]} // Reuse button style
                onPress={handleSave}
            >
                <Text style={globalStyles.addTaskButtonText}>Save Schedule</Text>
            </TouchableOpacity>
        </View>
    );
}

// Add specific styles for this screen
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f6fa', // Match global background
    },
    backButton: {
        position: 'absolute',
        top: 55,
        left: 15,
        zIndex: 1,
        padding: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1c1c1e',
        textAlign: 'center',
        marginBottom: 15,
        marginTop: 30, // Adjust if back button overlaps
    },
    subtitle: {
        fontSize: 16,
        color: '#6c6c6e',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    timeSelectorContainer: {
        marginBottom: 25,
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: '#3c3c3e',
        marginBottom: 10,
    },
    // Use globalStyles.selectionButton for the trigger
    saveButton: {
        marginTop: 40, // Add space above save button
    },
    doneButton: { // Style for iOS Done button
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    doneButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
