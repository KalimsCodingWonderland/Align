// app/paperImport.js

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Image,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
// Import API helpers
import { getTasks, parseImageTasks, parseTaskDetails, addTask } from '../constants/api';
// Import recurrence helper for expanding recurring tasks
import { generateRecurringTasks } from '../constants/recurrence';

// ------------------------
// Helper Functions
// ------------------------

const normalizeDuration = (durationStr) => {
    if (!durationStr) return "DEFAULT";
    if (durationStr.includes(':')) {
        const [h, m] = durationStr.split(':');
        const hours = Number(h).toString().padStart(2, '0');
        const minutes = Number(m).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } else {
        const lower = durationStr.toLowerCase();
        let hours = 0, minutes = 0;
        // Use regex patterns that allow an optional "s" after "hour"/"hr" and "min"
        const hourMatch = lower.match(/(\d+)\s*(?:hour|hr)s?/);
        if (hourMatch) {
            hours = parseInt(hourMatch[1], 10);
        }
        const minuteMatch = lower.match(/(\d+)\s*min(?:s)?/);
        if (minuteMatch) {
            minutes = parseInt(minuteMatch[1], 10);
        }
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
};


const formatTaskTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit'});
};

const formatCompletionTime = (timeStr) => {
    if (!timeStr || timeStr === "DEFAULT") return "Default";
    return formatDuration(timeStr);
};

const formatDuration = (durationStr) => {
    if (!durationStr || durationStr === "DEFAULT") return "Default";
    if (durationStr.includes(':')) {
        const [h, m] = durationStr.split(':').map(Number);
        let parts = [];
        if (h > 0) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
        if (m > 0) parts.push(`${m} min`);
        return parts.length > 0 ? parts.join(' ') : "0 min";
    }
    return durationStr;
};

const calculateEndTime = (startDateISO, duration) => {
    if (duration === "DEFAULT") duration = "01:00";
    const startDate = new Date(startDateISO);
    const [hours, minutes] = duration.split(':').map(Number);
    const endTime = new Date(startDate.getTime());
    // Use setHours/setMinutes so the math is done in local time.
    endTime.setHours(endTime.getHours() + hours);
    endTime.setMinutes(endTime.getMinutes() + minutes);
    // Directly format the local time instead of converting to an ISO string.
    return endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};


const formatSectionDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    // Create a local date (month is zero-indexed)
    const date = new Date(year, month - 1, day);
    let formatted = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${formatted} - ${weekday}`;
};



const formatTaskDate = (dateString) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short',}).toUpperCase();
    return `${month}/${day} - ${weekday}`;
};

const isSameLocalDate = (date1, date2) => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};


const durationToMilliseconds = (duration) => {
    if (!duration || duration === 'DEFAULT') duration = '01:00';
    const [h, m] = duration.split(':').map(Number);
    return (h * 60 + m) * 60 * 1000;
};

const timeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === 'DEFAULT') return 60;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// --- NEW: CONFLICT LOGIC INCLUDING SLEEP ---

const getSleepSchedule = async () => {
    let wakeTime = await AsyncStorage.getItem('wakeTime') || "07:00";
    let bedtime = await AsyncStorage.getItem('bedtimeTime') || "23:00";
    return { wakeTime, bedtime };
};

const getSleepIntervals = (newTaskStart, wakeTimeStr, bedtimeStr) => {
    // Convert the new task's local date/time
    const localTaskDate = new Date(newTaskStart);
    const localHour = localTaskDate.getHours();
    const localMinute = localTaskDate.getMinutes();

    // Convert bedtime/wakeTime to hours/minutes
    const [bH, bM] = bedtimeStr.split(':').map(Number);
    const [wH, wM] = wakeTimeStr.split(':').map(Number);

    // Decide which *calendar day* to treat as the "bedtime day":
    // If the new task is before your wake time, we shift bedtime to the previous day
    // so that "11:45 PM (day X) to 7:35 AM (day X+1)" always catches conflicts at 1 AM, 2 AM, etc.
    let bedtimeDay = new Date(localTaskDate);
    bedtimeDay.setHours(0, 0, 0, 0); // midnight of the *newTask* day

    if (localHour < wH || (localHour === wH && localMinute < wM)) {
        // Task is in the after-midnight-but-before-wake block:
        // so bedtime actually started the previous calendar day
        bedtimeDay.setDate(bedtimeDay.getDate() - 1);
    }

    // Build the bedtime (e.g., day X @ 23:45)
    const bedtimeDate = new Date(bedtimeDay);
    bedtimeDate.setHours(bH, bM, 0, 0);

    // Build the wake time for the next day (day X+1 @ 7:35)
    const wakeDay = new Date(bedtimeDay);
    wakeDay.setDate(wakeDay.getDate() + 1);
    wakeDay.setHours(wH, wM, 0, 0);

    // Return the single interval covering bedtime -> next morning wake
    return [
        {
            start: bedtimeDate,
            end: wakeDay,
        }
    ];
};


const getConflictingTasks = async (newTaskStart, duration, existingTasks) => {
    const { wakeTime, bedtime } = await getSleepSchedule();
    const expandedTasks = existingTasks.flatMap(task => generateRecurringTasks(task));
    const newTaskEnd = new Date(newTaskStart.getTime() + durationToMilliseconds(duration));
    const conflicts = [];

    for (const task of expandedTasks) {
        const taskStart = new Date(task.date);
        if (!isSameLocalDate(newTaskStart, taskStart)) continue;
        const taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(task.time));
        if (newTaskStart < taskEnd && taskStart < newTaskEnd) {
            conflicts.push(task);
        }
    }

    const sleepIntervals = getSleepIntervals(newTaskStart, wakeTime, bedtime);
    for (const interval of sleepIntervals) {
        if (newTaskStart < interval.end && interval.start < newTaskEnd) {
            conflicts.push({
                _id: `sleep_${interval.start.toISOString()}`,
                text: "Sleep Schedule",
                category: "SLEEP",
                date: interval.start.toISOString(),
                time: `${Math.floor((interval.end - interval.start) / 3600000)
                    .toString()
                    .padStart(2, '0')}:${Math.floor(((interval.end - interval.start) % 3600000) / 60000)
                    .toString()
                    .padStart(2, '0')}`,
                isRecurring: false,
                predicted: false,
            });
            break;
        }
    }

    const uniqueConflicts = Array.from(new Map(conflicts.map(c => [c._id, c])).values());

    return uniqueConflicts;
};

const showConflictsAlert = (newTask, conflicts) => {
    const newTaskStartTime = formatTaskTime(newTask.date);
    const newTaskEndTime = calculateEndTime(newTask.date, newTask.time);
    let conflictItems = '';

    conflicts.forEach(conf => {
        const conflictStartTime = formatTaskTime(conf.date);
        const conflictEndTime = calculateEndTime(conf.date, conf.time === 'DEFAULT' ? '01:00' : conf.time);
        const conflictName = conf.category === "SLEEP" ? conf.text : `"${conf.text}"`;
        conflictItems += `• ${conflictName} (${conflictStartTime}–${conflictEndTime})\n`;
    });

    const fullMessage =
        `Your new task "${newTask.text}" (${newTaskStartTime}–${newTaskEndTime}) overlaps with:\n\n` +
        conflictItems +
        "\nHow do you want to proceed?";

    return new Promise((resolve) => {
        Alert.alert(
            'Time Conflict Detected',
            fullMessage,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve("cancel") },
                { text: 'Override', onPress: () => resolve("override") },
                { text: 'Smart Align', onPress: () => resolve("smart") },
            ],
            { cancelable: false }
        );
    });
};

const isValidDate = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

const smartAlignTask = async (newTask, existingTasks) => {
    const { wakeTime, bedtime } = await getSleepSchedule();
    const wakeMinutes = timeToMinutes(wakeTime);
    const bedMinutes = timeToMinutes(bedtime);

    let originalDate = new Date(newTask.date);
    let originalDayStart = new Date(originalDate);
    originalDayStart.setHours(0, 0, 0, 0);

    let awakeStartForOriginal = new Date(originalDayStart);
    awakeStartForOriginal.setMinutes(wakeMinutes);
    let awakeEndForOriginal = new Date(originalDayStart);
    awakeEndForOriginal.setMinutes(bedMinutes);

    let startDate;
    if (originalDate >= awakeEndForOriginal) {
        // Past bedtime => shift to tomorrow
        startDate = new Date(originalDayStart);
        startDate.setDate(startDate.getDate() + 1);
    } else {
        // It's before bedtime => stay on the same day
        startDate = new Date(originalDayStart);
    }

    const taskDurationMs = durationToMilliseconds(newTask.time);

    const allExpandedTasks = existingTasks.flatMap(t => generateRecurringTasks(t));

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        let currentDayBase = new Date(startDate);
        currentDayBase.setDate(startDate.getDate() + dayOffset);
        currentDayBase.setHours(0, 0, 0, 0);

        let awakeStart = new Date(currentDayBase);
        awakeStart.setMinutes(wakeMinutes);

        let awakeEnd = new Date(currentDayBase);
        awakeEnd.setMinutes(bedMinutes);

        const dayTasks = allExpandedTasks
            .filter(task => {
                let taskStart = new Date(task.date);
                let taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(task.time));
                return taskStart < awakeEnd && taskEnd > awakeStart;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const busyIntervals = dayTasks.map(task => {
            let taskStart = new Date(task.date);
            let taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(task.time));
            return {
                start: new Date(Math.max(taskStart.getTime(), awakeStart.getTime())),
                end: new Date(Math.min(taskEnd.getTime(), awakeEnd.getTime()))
            };
        }).filter(interval => interval.end > interval.start);

        let pointer = new Date(awakeStart.getTime());
        for (let i = 0; i <= busyIntervals.length; i++) {
            let freeStart = new Date(pointer.getTime());
            let freeEnd = (i < busyIntervals.length) ? new Date(busyIntervals[i].start.getTime()) : new Date(awakeEnd.getTime());
            if (freeEnd > awakeEnd) {
                freeEnd = new Date(awakeEnd.getTime());
            }
            if (freeStart < freeEnd) {
                let freeDurationMs = freeEnd.getTime() - freeStart.getTime();
                if (freeDurationMs >= taskDurationMs) {
                    return { ...newTask, date: freeStart.toISOString() };
                }
            }
            if (i < busyIntervals.length) {
                pointer = new Date(Math.max(pointer.getTime(), busyIntervals[i].end.getTime()));
            } else {
                pointer = new Date(awakeEnd.getTime());
            }
            if (pointer >= awakeEnd) break;
        }
    }

    Alert.alert("Smart Align Failed", "Could not find an open slot within the next 7 days during your awake hours.");
    return null;
};

const showConflictsAlertForFeedback = (newTask, conflicts) => {
    // This function remains unchanged if used for feedback.
};

// ------------------------
// Main Component: PaperImportScreen
// ------------------------

export default function PaperImportScreen() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [importSuccess, setImportSuccess] = useState(null);
    const [manualQueue, setManualQueue] = useState([]);
    const [currentManual, setCurrentManual] = useState(null);
    const router = useRouter();
    // Fetch existing tasks for conflict checking
    const [allTasks, setAllTasks] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    const fetchedTasks = await getTasks(token);
                    if (Array.isArray(fetchedTasks)) {
                        setAllTasks(fetchedTasks);
                    }
                }
            } catch (err) {
                console.log('Error fetching tasks for conflict check:', err);
            }
        })();
    }, []);

    // When a manual task (with no category) is confirmed, include recurrence info if available
    const handleManualCategorySelection = async (selectedCategory) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const task = currentManual;
            const recurrence = task.recurrence ? task.recurrence : { type: 'none' };
            const taskToAdd = {
                text: task.text,
                category: selectedCategory,
                time: task.duration,
                date: task.date,
                recurrence: recurrence,
                isRecurring: recurrence && recurrence.type !== 'none',
            };

            // NEW: Conflict check with updated logic (including sleep and smart align)
            const conflicts = await getConflictingTasks(new Date(taskToAdd.date), taskToAdd.time, allTasks);
            if (conflicts.length > 0) {
                const decision = await showConflictsAlert(taskToAdd, conflicts);
                if (decision === "cancel") {
                    const remaining = manualQueue.slice(1);
                    setManualQueue(remaining);
                    setCurrentManual(remaining[0] || null);
                    return;
                } else if (decision === "smart") {
                    const smartAlignedTask = await smartAlignTask(taskToAdd, allTasks);
                    if (smartAlignedTask) {
                        taskToAdd.date = smartAlignedTask.date;
                    } else {
                        const remaining = manualQueue.slice(1);
                        setManualQueue(remaining);
                        setCurrentManual(remaining[0] || null);
                        return;
                    }
                }
            }

            // Add the task (with recurrence fields included)
            const response = await addTask(taskToAdd, token);
            if (response._id) {
                setAllTasks(prev => [...prev, response]);
            }

            const remaining = manualQueue.slice(1);
            setManualQueue(remaining);
            setCurrentManual(remaining[0] || null);

        } catch (e) {
            console.log('Manual add error:', e);
        }
    };

    // Function to pick an image from camera or gallery and process it
    const pickImage = async (useCamera = false) => {
        setLoading(true);
        setError('');
        setImportSuccess(null);
        setResults([]);
        setManualQueue([]);
        setCurrentManual(null);

        try {
            // 1️⃣ Request permissions
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (useCamera && cameraStatus !== 'granted') {
                Alert.alert('Permission required', 'Camera access is needed to take photos.');
                setLoading(false);
                return;
            }
            if (!useCamera && mediaStatus !== 'granted') {
                Alert.alert('Permission required', 'Photo library access is needed to choose images.');
                setLoading(false);
                return;
            }
            // Updated options: disallow cropping
            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
                base64: true,
            };

            const result = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (!result.canceled) {
                const image = result.assets[0];
                setSelectedImage(image.uri);
                const base64 = image.base64;
                const taskTexts = await parseImageTasks(base64);
                const token = await AsyncStorage.getItem('token');
                let importedTasks = [];
                let queuedManuals = [];
                // Create a local accumulator for conflict checking that includes newly added tasks in this batch
                let updatedTasks = [...allTasks];

                // Loop through each OCR line.
                // The regex now also captures a Recurrence field.
                for (const line of taskTexts) {
                    try {
                        const match = line.match(
                            /Task:\s*([^|]+)\|\s*Date:\s*([^|]+)\|\s*Time:\s*([^|]+)\|\s*Duration:\s*([^|]+)\|\s*Recurrence:\s*(.*)/i
                        );
                        if (!match) {
                            console.error('OCR line did not match expected format:', line);
                            importedTasks.push({
                                text: line,
                                success: false,
                                error: 'Unrecognized format from image scan.'
                            });
                            continue;
                        }

                        let [, desc, rawDate, rawTime, rawDuration, rawRecurrence] = match;
                        desc = desc.trim();
                        rawDate = rawDate.trim();
                        rawTime = rawTime.trim();
                        rawDuration = rawDuration.trim();
                        rawRecurrence = rawRecurrence.trim();

                        // Include recurrence info in the typed string so parseTaskDetails can extract it.
                        const recurrencePhrase = rawRecurrence.toLowerCase() === 'none'
                            ? 'with no recurrence'
                            : `with recurrence ${rawRecurrence}`;

                        const typedString = `${desc} on ${rawDate} at ${rawTime} for ${rawDuration} ${recurrencePhrase}`;
                        const details = await parseTaskDetails(typedString);
                        let normalized = normalizeDuration(details.duration);
                        if (normalized === "00:00") normalized = "DEFAULT";

                        const isoDate = new Date(`${details.scheduled_date}T${details.scheduled_time}:00`).toISOString();

                        // If the OCR/parsing returns "MANUAL", queue it for manual category selection
                        if (details.category === "MANUAL") {
                            queuedManuals.push({
                                text: desc,
                                date: isoDate,
                                duration: normalized,
                                recurrence: details.recurrence, // include recurrence info
                            });
                            continue;
                        }

                        // Build the new task object including recurrence details
                        const newTask = {
                            text: desc,
                            category: details.category,
                            time: normalized,
                            date: isoDate,
                            recurrence: details.recurrence,
                            isRecurring: details.recurrence && details.recurrence.type !== 'none',
                        };

                        // Check for conflicts (including sleep) using the local accumulator updatedTasks
                        const conflicts = await getConflictingTasks(new Date(newTask.date), newTask.time, updatedTasks);
                        if (conflicts.length > 0) {
                            const decision = await showConflictsAlert(newTask, conflicts);
                            if (decision === "cancel") {
                                importedTasks.push({
                                    text: desc,
                                    success: true,
                                    error: 'User cancelled due to conflict(s).',
                                });
                                continue;
                            } else if (decision === "smart") {
                                const smartAlignedTask = await smartAlignTask(newTask, updatedTasks);
                                if (smartAlignedTask) {
                                    newTask.date = smartAlignedTask.date;
                                } else {
                                    importedTasks.push({
                                        text: desc,
                                        success: true,
                                        error: 'Smart Align failed to find a slot.',
                                    });
                                    continue;
                                }
                            }
                        }

                        // Add the task to the DB (and later to UI)
                        const response = await addTask(newTask, token);
                        if (response._id) {
                            // Update both the state and the local tasks accumulator
                            updatedTasks.push(response);
                            setAllTasks(prev => [...prev, response]);
                        }
                        importedTasks.push({
                            text: desc,
                            success: !!response._id,
                            error: response.error || null,
                        });

                    } catch (e) {
                        console.error('Error processing OCR line:', e);
                        importedTasks.push({
                            text: line,
                            success: false,
                            error: e.message,
                        });
                    }
                }

                setResults(importedTasks);
                setManualQueue(queuedManuals);
                setCurrentManual(queuedManuals[0] || null);
                const anySuccess = importedTasks.some(r => r.success);
                setImportSuccess(anySuccess);
            }
        } catch (err) {
            console.error('Error during image processing:', err);
            setError('Failed to process image: ' + err.message);
            setImportSuccess(false);
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan Paper Schedule</Text>
            {selectedImage && (
                <Image
                    source={{ uri: selectedImage }}
                    style={styles.previewImage}
                    resizeMode="contain"
                />
            )}
            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={[styles.button, styles.cameraButton]}
                    onPress={() => pickImage(true)}
                    disabled={loading}
                >
                    <MaterialIcons name="camera-alt" size={24} color="white" />
                    <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.galleryButton]}
                    onPress={() => pickImage(false)}
                    disabled={loading}
                >
                    <MaterialIcons name="photo-library" size={24} color="white" />
                    <Text style={styles.buttonText}>Choose from Gallery</Text>
                </TouchableOpacity>
            </View>
            {loading && <ActivityIndicator size="large" color="#007AFF" />}
            <View style={styles.resultsContainer}>
                {importSuccess === true && <Text style={styles.successIcon}>✓</Text>}
                {importSuccess === false && (
                    <>
                        <Text style={styles.errorIcon}>✕</Text>
                        <Text style={styles.error}>{error}</Text>
                    </>
                )}
            </View>
            {/* Manual Category Modal */}
            <Modal visible={!!currentManual} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>This task has no category:</Text>
                        <Text style={{ marginBottom: 10 }}>{currentManual?.text}</Text>
                        <ScrollView>
                            {[
                                'STUDY',
                                'ENTERTAINMENT',
                                'WORK',
                                'EVENT',
                                'ERRAND',
                                'EXERCISE',
                                'HOUSEHOLD CHORE',
                                'OTHER'
                            ].map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={styles.categoryButton}
                                    onPress={() => handleManualCategorySelection(cat)}
                                >
                                    <Text style={styles.categoryText}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        top: -20,
        flex: 1,
        paddingTop: 90,
        padding: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    cameraButton: {
        backgroundColor: '#007AFF',
    },
    galleryButton: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        color: 'red',
        marginTop: 10,
        textAlign: 'center',
    },
    resultsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIcon: {
        fontSize: 48,
        color: '#4CAF50',
        textAlign: 'center',
        marginTop: 20,
    },
    errorIcon: {
        fontSize: 48,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 20,
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 10,
        marginBottom: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    categoryButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
        marginVertical: 5,
        width: '100%',
        alignItems: 'center',
    },
    categoryText: {
        color: 'white',
        fontSize: 16,
    },
});

export { formatTaskTime, calculateEndTime, isSameLocalDate, durationToMilliseconds };