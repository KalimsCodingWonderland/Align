// app/alignSleep.js
import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { styles as globalStyles } from './styles';
import { useTheme } from './ThemeContext';          // ⬅️ NEW

/* ───────── helpers (unchanged) ───────── */
const formatTimeToHHMM = (d) => `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

const formatDisplayTime = (hhmm) => {
    if (!hhmm) return 'Not Set';
    const [h, m] = hhmm.split(':').map(Number);
    const date   = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const createDateFromHHMM = (hhmm) => {
    const d = new Date();
    if (hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        d.setHours(h, m, 0, 0);
    } else {
        d.setHours(23, 0, 0, 0); // sensible default
    }
    return d;
};

/* ───────── component ───────── */
export default function AlignSleepScreen() {
    const { theme } = useTheme();                 // ⬅️ NEW
    const isDark  = theme.mode === 'dark';
    const fg      = (l, d = l) => (isDark ? d : l);

    const router = useRouter();

    const [bedtime,  setBedtime]  = useState(null);
    const [wakeTime, setWakeTime] = useState(null);

    const [pickerDate, setPickerDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('bedtime');

    /* load saved */
    useEffect(() => {
        (async () => {
            const bt = (await AsyncStorage.getItem('bedtimeTime')) || '23:00';
            const wt = (await AsyncStorage.getItem('wakeTime'))   || '07:00';
            setBedtime(bt);
            setWakeTime(wt);
        })();
    }, []);

    /* picker change */
    const onChangePicker = (_, selected) => {
        setShowPicker(Platform.OS === 'ios');
        if (selected) {
            const t = formatTimeToHHMM(selected);
            pickerMode === 'bedtime' ? setBedtime(t) : setWakeTime(t);
            if (Platform.OS !== 'ios') setPickerDate(selected);
        }
    };

    const showTimePicker = (mode) => {
        setPickerMode(mode);
        setPickerDate(createDateFromHHMM(mode === 'bedtime' ? bedtime : wakeTime));
        setShowPicker(true);
    };

    /* save */
    const handleSave = async () => {
        try {
            await AsyncStorage.setItem('bedtimeTime', bedtime);
            await AsyncStorage.setItem('wakeTime',  wakeTime);
            Alert.alert('Success', 'Sleep schedule saved!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert('Error', 'Could not save sleep schedule.');
        }
    };

    /* ───────── UI ───────── */
    return (
        <View style={[local.container, { backgroundColor: fg('#f5f6fa', '#000') }]}>
            <TouchableOpacity style={local.backButton} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={28} color={theme.primary} />
            </TouchableOpacity>

            <Text style={[local.title, { color: fg('#1c1c1e', '#f5f6fa') }]}>
                Align Sleep Schedule
            </Text>

            <Text style={[local.subtitle, { color: fg('#6c6c6e', '#aaaaab') }]}>
                Set your regular sleep times. Align will avoid scheduling tasks during
                these hours and can use them with Smart Align.
            </Text>

            {/* Bedtime */}
            <View style={local.timeSelector}>
                <Text style={[local.label, { color: fg('#3c3c3e', '#f5f6fa') }]}>
                    Bedtime
                </Text>
                <TouchableOpacity
                    style={[
                        globalStyles.selectionButton,
                        { borderColor: fg('#e5e5ea', '#555') },        // stronger on dark
                    ]}
                    onPress={() => showTimePicker('bedtime')}
                >
                    <Text
                        style={[
                            globalStyles.selectionButtonText,
                            { color: fg('#1c1c1e', '#f5f6fa') },
                        ]}
                    >
                        {formatDisplayTime(bedtime)}
                    </Text>
                    <Text style={[globalStyles.selectionButtonIcon, { color: fg('#8e8e93', '#a1a1a4') }]}>
                        ⌄
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Wake-up */}
            <View style={local.timeSelector}>
                <Text style={[local.label, { color: fg('#3c3c3e', '#f5f6fa') }]}>
                    Wake-up Time
                </Text>
                <TouchableOpacity
                    style={[
                        globalStyles.selectionButton,
                        { borderColor: fg('#e5e5ea', '#555') },
                    ]}
                    onPress={() => showTimePicker('wakeTime')}
                >
                    <Text
                        style={[
                            globalStyles.selectionButtonText,
                            { color: fg('#1c1c1e', '#f5f6fa') },
                        ]}
                    >
                        {formatDisplayTime(wakeTime)}
                    </Text>
                    <Text style={[globalStyles.selectionButtonIcon, { color: fg('#8e8e93', '#a1a1a4') }]}>
                        ⌄
                    </Text>
                </TouchableOpacity>
            </View>

            {showPicker && (
                <>
                    <DateTimePicker
                        value={pickerDate}
                        mode="time"
                        display="spinner"
                        is24Hour={false}
                        onChange={onChangePicker}
                    />
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity style={local.doneButton} onPress={() => setShowPicker(false)}>
                            <Text style={local.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Save */}
            <TouchableOpacity
                style={[globalStyles.addTaskButton, local.saveButton]}
                onPress={handleSave}
            >
                <Text style={globalStyles.addTaskButtonText}>Save Schedule</Text>
            </TouchableOpacity>
        </View>
    );
}

/* ───────── local styles ───────── */
const local = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 90,
        paddingHorizontal: 20,
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
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    timeSelector: { marginBottom: 25 },
    label: { fontSize: 18, fontWeight: '600', marginBottom: 10 },

    saveButton: { marginTop: 40 },

    doneButton: {
        backgroundColor: '#007AFF',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        alignSelf: 'center',
        minWidth: 120,
    },
    doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
