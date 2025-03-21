// Updated app/paperImport.js with manual category handling queue

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
    Alert,  // <-- for conflict confirmation if you want
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
// Import or define your conflict helpers:
import { getTasks, parseImageTasks, parseTaskDetails, addTask } from '../constants/api';

const isSameUTCDate = (date1, date2) => {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
};

const durationToMilliseconds = (duration) => {
    if (duration === 'DEFAULT') return 0;
    const [hours, minutes] = duration.split(':').map(Number);
    return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
};

const formatTaskTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour
    return `${hours}:${minutes} ${ampm}`;
};

const calculateEndTime = (startDate, duration) => {
    if (duration === 'DEFAULT') duration = '00:00'; // up to you
    const [h, m] = duration.split(':').map(Number);
    const end = new Date(startDate);
    end.setUTCHours(end.getUTCHours() + h);
    end.setUTCMinutes(end.getUTCMinutes() + m);
    return formatTaskTime(end.toISOString());
};


const getConflictingTasks = (newStart, duration, existingTasks) => {
    const newEnd = new Date(newStart.getTime() + durationToMilliseconds(duration));
    const conflicts = [];

    for (const task of existingTasks) {
        const taskStart = new Date(task.date);
        if (!isSameUTCDate(newStart, taskStart)) continue;

        const taskDuration = task.time;
        const taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(taskDuration));

        // Overlaps if newStart < existingTaskEnd AND existingTaskStart <= newEnd
        if (newStart < taskEnd && taskStart <= newEnd) {
            conflicts.push(task); // Push the entire conflicting task object
        }
    }

    return conflicts; // Return an array of all conflicting tasks
};

const showConflictsAlert = (newTask, conflicts) => {
    // Example: “Your new task "Study math" from 9:00 AM–10:00 AM overlaps with…”
    // Then list each conflict with date/time or the conflict’s text.

    // 1) Format the new task’s timeframe
    const newTaskStartTime = formatTaskTime(newTask.date); // e.g. “9:00 AM”
    const newTaskEndTime = calculateEndTime(newTask.date, newTask.time); // e.g. “10:00 AM”

    // 2) Build a list of conflict strings
    let conflictItems = '';
    conflicts.forEach(conf => {
        const conflictStartTime = formatTaskTime(conf.date);
        const conflictEndTime = calculateEndTime(conf.date, conf.time);
        conflictItems += `• "${conf.text}" (${conflictStartTime}–${conflictEndTime})\n`;
    });

    // 3) Construct full message
    const fullMessage =
        `Your new task "${newTask.text}" (${newTaskStartTime}–${newTaskEndTime}) overlaps with:\n\n` +
        conflictItems +
        "\nDo you want to schedule it anyway?";

    // 4) Display the alert
    return new Promise((resolve) => {
        Alert.alert(
            'Time Conflict Detected',
            fullMessage,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Align Anyway', onPress: () => resolve(true) },
            ],
            { cancelable: false }
        );
    });
};


// Normalizes strings like "2:30", "1 hour 15 min", or "DEFAULT" to HH:MM
const normalizeDuration = (durationStr) => {
    if (!durationStr || durationStr.toUpperCase() === 'DEFAULT') return 'DEFAULT';
    if (durationStr.includes(':')) {
        const [h, m] = durationStr.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    const lower = durationStr.toLowerCase();
    let hours = 0, minutes = 0;
    const hourMatch = lower.match(/(\d+)\s*(hour|hr)/);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);
    const minuteMatch = lower.match(/(\d+)\s*(min)/);
    if (minuteMatch) minutes = parseInt(minuteMatch[1], 10);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const categories = [
    'STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT', 'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE', 'OTHER'
];

export default function PaperImportScreen() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [importSuccess, setImportSuccess] = useState(null);
    const [manualQueue, setManualQueue] = useState([]);
    const [currentManual, setCurrentManual] = useState(null);
    const router = useRouter();

    // We'll store tasks from DB to check conflicts:
    const [allTasks, setAllTasks] = useState([]);

    // On mount, fetch existing tasks for conflict-checking:
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

    const handleManualCategorySelection = async (selectedCategory) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const task = currentManual;
            const taskToAdd = {
                text: task.text,
                category: selectedCategory,
                time: task.duration,
                date: task.date,
            };

            // Conflict check here, too:
            const conflicts = getConflictingTasks(
                new Date(taskToAdd.date),
                taskToAdd.time,
                allTasks
            );
            if (conflicts.length > 0) {
                const proceed = await showConflictsAlert(taskToAdd, conflicts);
                if (!proceed) {
                    // 1) Skip just THIS task
                    const remaining = manualQueue.slice(1);
                    setManualQueue(remaining);
                    setCurrentManual(remaining[0] || null);

                    // 2) If no more tasks in the queue, close the modal
                    if (remaining.length === 0) {
                        const anySuccess = results.some(r => r.success);
                        setShowCategoryModal(false);
                    }

                    return; // Return so we do not attempt to add the conflicting task
                }
            }

// Now we can add it...
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

    // We'll create a small helper to ask user if they'd like to proceed
    const confirmConflict = () => {
        return new Promise((resolve) => {
            Alert.alert(
                'Time Conflict',
                'This task overlaps with an existing task. Proceed anyway?',
                [
                    { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                    { text: 'Add Anyway', onPress: () => resolve(true) }
                ],
                { cancelable: false }
            );
        });
    };

    const pickImage = async (useCamera = false) => {
        setLoading(true);
        setError('');
        setImportSuccess(null);
        setResults([]);
        setManualQueue([]);
        setCurrentManual(null);

        try {
            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
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

                // Loop lines from OCR
                for (const line of taskTexts) {
                    try {
                        const match = line.match(
                            /Task:\s*([^|]+)\|\s*Date:\s*([^|]+)\|\s*Time:\s*([^|]+)\|\s*Duration:\s*(.*)/i
                        );
                        if (!match) {
                            importedTasks.push({
                                text: line,
                                success: false,
                                error: 'Unrecognized format from image scan.'
                            });
                            continue;
                        }

                        let [, desc, rawDate, rawTime, rawDuration] = match;
                        desc = desc.trim();
                        rawDate = rawDate.trim();
                        rawTime = rawTime.trim();
                        rawDuration = rawDuration.trim();

                        const typedString = `${desc} on ${rawDate} at ${rawTime} for ${rawDuration}`;
                        const details = await parseTaskDetails(typedString);

                        let normalized = normalizeDuration(details.duration);
                        if (normalized === "00:00") normalized = "DEFAULT";

                        const isoDate = new Date(`${details.scheduled_date}T${details.scheduled_time}:00Z`).toISOString();

                        if (details.category === "MANUAL") {
                            queuedManuals.push({
                                text: desc,
                                date: isoDate,
                                duration: normalized,
                            });
                            continue;
                        }

                        const newTask = {
                            text: desc,
                            category: details.category,
                            time: normalized,
                            date: isoDate,
                        };

                        // Grab all conflicts:
                        const conflicts = getConflictingTasks(
                            new Date(newTask.date),
                            newTask.time,
                            allTasks
                        );

                        if (conflicts.length > 0) {
                            const proceed = await showConflictsAlert(newTask, conflicts);
                            if (!proceed) {
                                // User canceled, so skip adding this OCR task:
                                importedTasks.push({
                                    text: desc,
                                    success: true,
                                    error: 'User cancelled due to conflict(s).',
                                });
                                continue;
                            }
                        }

                        // If user proceeds, add to DB:
                        const response = await addTask(newTask, token);

                        // If success, add to local array so subsequent tasks see it for conflict checks:
                        if (response._id) {
                            setAllTasks(prev => [...prev, response]);
                        }

                        importedTasks.push({
                            text: desc,
                            success: !!response._id,
                            error: response.error || null,
                        });

                    } catch (e) {
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
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
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
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.resultsContainer}>
                {importSuccess === true && <Text style={styles.successIcon}>✓</Text>}
                {importSuccess === false && <Text style={styles.errorIcon}>✕</Text>}
            </View>

            {/* Manual Category Modal */}
            <Modal visible={!!currentManual} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>This task has no category:</Text>
                        <Text style={{ marginBottom: 10 }}>{currentManual?.text}</Text>
                        <ScrollView>
                            {categories.map((cat) => (
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
        marginBottom: 10,
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
        height: 200,
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
