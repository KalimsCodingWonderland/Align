// app/paperImport.js

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { parseImageTasks, parseTaskDetails, addTask } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

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

export default function PaperImportScreen() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [importSuccess, setImportSuccess] = useState(null);
    const router = useRouter();

    const pickImage = async (useCamera = false) => {
        setLoading(true);
        setError('');
        setImportSuccess(null);

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

                for (const line of taskTexts) {
                    try {
                        // Format from the parseImageTasks prompt:
                        // "Task: [desc] | Date: YYYY-MM-DD | Time: HH:MM | Duration: ..."
                        // We'll parse that line carefully:
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

// Normalize duration
                        let normalizedDuration = normalizeDuration(details.duration);
                        if (normalizedDuration === "00:00") {
                            normalizedDuration = "DEFAULT";
                        }

                        const newTask = {
                            text: desc,
                            category: details.category,
                            ...(normalizedDuration && { time: normalizedDuration }), // only add if present
                            date: new Date(`${details.scheduled_date}T${details.scheduled_time}:00Z`).toISOString(),
                        };

                        const response = await addTask(newTask, token);
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
                const anySuccess = importedTasks.some(r => r.success);
                setImportSuccess(anySuccess);

                // *** IMPORTANT FIX ***
                // If at least one task was successfully added,
                // navigate to the main tasks screen so it re-fetches
                // from the server and shows them immediately:
                if (anySuccess) {
                    // Small delay so user sees success checkmark (optional)
                    setTimeout(() => {
                        router.replace('/taskManagment');
                    }, 800);
                }
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

            {/* Show success or error icons at the bottom if you wish */}
            <View style={styles.resultsContainer}>
                {importSuccess === true && (
                    <Text style={styles.successIcon}>✓</Text>
                )}
                {importSuccess === false && (
                    <Text style={styles.errorIcon}>✕</Text>
                )}
            </View>
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
});
