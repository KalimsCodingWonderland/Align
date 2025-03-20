// app/taskManagment.js

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    Modal,
    TouchableOpacity,
    FlatList,
    SectionList,
    ScrollView,
    Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { Animated } from 'react-native';
import AddTaskTab from '../components/addTask';
import ListViewTab from '../components/listView';
import CalendarViewTab from '../components/calendar';
import { styles, getCategoryColor } from './styles';
import {
    categorizeTask,
    parseTaskDetails,
    getTasks,
    addTask,
    updateTask,
    deleteTask,
} from '../constants/api';
import {generateRecurringTasks} from "../constants/recurrence";

const categories = [
    'STUDY',
    'ENTERTAINMENT',
    'WORK',
    'EVENT',
    'ERRAND',
    'EXERCISE',
    'HOUSEHOLD CHORE',
    'OTHER',
];

// Helper functions remain unchanged.
const normalizeDuration = (durationStr) => {
    if (!durationStr) return "DEFAULT";
    if (durationStr.includes(':')) {
        const [h, m] = durationStr.split(':');
        const hours = Number(h).toString().padStart(2, '0');
        const minutes = Number(m).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } else {
        const lower = durationStr.toLowerCase();
        let hours = 0,
            minutes = 0;
        const hourMatch = lower.match(/(\d+)\s*(hour|hr)/);
        if (hourMatch) {
            hours = parseInt(hourMatch[1], 10);
        }
        const minuteMatch = lower.match(/(\d+)\s*(min)/);
        if (minuteMatch) {
            minutes = parseInt(minuteMatch[1], 10);
        }
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
};

const formatTaskTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
};

const formatCompletionTime = (timeStr) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(':');
    let h = Number(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${mStr} ${ampm}`;
};

const formatDuration = (durationStr) => {
    if (durationStr && durationStr.includes(':')) {
        const [h, m] = durationStr.split(':').map(Number);
        let parts = [];
        if (h > 0) {
            parts.push(`${h} hr${h > 1 ? 's' : ''}`);
        }
        if (m > 0) {
            parts.push(`${m} min`);
        }
        return parts.length > 0 ? parts.join(' ') : "DEFAULT";
    }
    return durationStr;
};

const calculateEndTime = (startDate, duration) => {
    if (duration === "DEFAULT") duration = "DEFAULT";
    const [hours, minutes] = duration.split(':').map(Number);
    const endTime = new Date(startDate);
    endTime.setUTCHours(endTime.getUTCHours() + hours);
    endTime.setUTCMinutes(endTime.getUTCMinutes() + minutes);
    return formatTaskTime(endTime.toISOString());
};

const formatSectionDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(Date.UTC(year, month - 1, day));
    const monthName = date.toLocaleDateString(undefined, { month: 'long', timeZone: 'UTC' });
    const weekday = date.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
    const dayInt = parseInt(day, 10);
    const ordinal = (n) => {
        const s = ['th','st','nd','rd'];
        const v = n % 100;
        return s[(v-20)%10] || s[v] || s[0];
    };
    const ordinalDay = `${dayInt}${ordinal(dayInt)}`;
    return `${monthName} ${ordinalDay}, ${year} - ${weekday}`;
};

const formatTaskDate = (dateString) => {
    const date = new Date(dateString);
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const weekday = date
        .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
        .toUpperCase();
    return `${month}/${day} - ${weekday}`;
};

//
// --- NEW: Conflict logic that enumerates conflicting tasks ---
//

// 1) A helper to see if two dates are on the same UTC day
const isSameUTCDate = (date1, date2) => {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
};

// 2) Convert a duration "HH:MM" into total milliseconds
const durationToMilliseconds = (duration) => {
    if (duration === 'DEFAULT') duration = '00:00';
    const [h, m] = duration.split(':').map(Number);
    return (h * 60 + m) * 60 * 1000;
};

// 3) Gather an array of all existing tasks that conflict with the new one
const getConflictingTasks = (newStart, duration, existingTasks) => {
    const newEnd = new Date(newStart.getTime() + durationToMilliseconds(duration));
    const conflicts = [];

    for (const task of existingTasks) {
        const taskStart = new Date(task.date);
        // Only compare if same day
        if (!isSameUTCDate(newStart, taskStart)) continue;

        const taskDuration = task.time;
        const taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(taskDuration));

        // Overlaps if newStart < existingTaskEnd AND existingTaskStart <= newEnd
        if (newStart < taskEnd && taskStart <= newEnd) {
            conflicts.push(task);
        }
    }
    return conflicts;
};

// 4) Show an Alert listing the new task time range plus each conflict’s time range
const showConflictsAlert = (newTask, conflicts) => {
    // Format the new task’s timeframe
    const newTaskStartTime = formatTaskTime(newTask.date);
    const newTaskEndTime = calculateEndTime(newTask.date, newTask.time);

    // Build a bullet list of conflict info
    let conflictItems = '';
    conflicts.forEach(conf => {
        const conflictStartTime = formatTaskTime(conf.date);
        const conflictEndTime = calculateEndTime(conf.date, conf.time);
        conflictItems += `• "${conf.text}" (${conflictStartTime}–${conflictEndTime})\n`;
    });

    // Construct the final message
    const fullMessage =
        `Your new task "${newTask.text}" (${newTaskStartTime}–${newTaskEndTime}) overlaps with:\n\n` +
        conflictItems +
        '\nDo you want to schedule it anyway?';

    // Return a Promise so we can `await` the user’s decision
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

export default function CalendarScreen() {
    const router = useRouter();
    const [token, setToken] = useState(null);
    const [taskInput, setTaskInput] = useState('');
    const [tasks, setTasks] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [activeView, setActiveView] = useState('tasks');
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editHour, setEditHour] = useState("12");
    const [editMinute, setEditMinute] = useState("00");
    const [scheduledPeriod, setScheduledPeriod] = useState("AM");
    const [editCategory, setEditCategory] = useState('');
    const [editTaskInput, setEditTaskInput] = useState('');
    const [editCompletionHour, setEditCompletionHour] = useState("12");
    const [editCompletionMinute, setEditCompletionMinute] = useState("00");
    const [completionPeriod, setCompletionPeriod] = useState("AM");
    const [editAmPm, setEditAmPm] = useState("AM");

    // State for feedback modal
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackTask, setFeedbackTask] = useState(null);
    const [awaitingCorrection, setAwaitingCorrection] = useState(false);
    const [correctedDuration, setCorrectedDuration] = useState("");

    // State for recurrence modal
    const [recurrenceType, setRecurrenceType] = useState('none');
    const [recurrenceDays, setRecurrenceDays] = useState([]);
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceEndType, setRecurrenceEndType] = useState('never');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(1);

    // Fetch tasks once on mount (or whenever this screen is pushed)
    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                const storedToken = await AsyncStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                    const tasksFromApi = await getTasks(storedToken);
                    if (Array.isArray(tasksFromApi)) {
                        setTasks(tasksFromApi);
                    }
                }

                // ✅ Also check if manualTask was passed via paper import
                const stored = await AsyncStorage.getItem('manualTask');
                if (stored) {
                    const manualTask = JSON.parse(stored);
                    setCurrentTask(manualTask);
                    setShowCategoryModal(true);
                    await AsyncStorage.removeItem('manualTask');
                }
            };

            loadData();
        }, [])
    );


    const getLocalDateKey = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'UTC' });
    };

    const handleAddTask = async () => {
        if (!taskInput.trim()) return;

        const details = await parseTaskDetails(taskInput.trim());
        const { category, scheduled_date, scheduled_time, duration } = details;
        const [year, month, day] = scheduled_date.split('-');
        const [hour, minute] = scheduled_time.split(':');
        const newTaskDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0));

        if (category === 'MANUAL') {
            // If the parse says "MANUAL," we ask user to pick a category
            setCurrentTask({ text: taskInput, date: newTaskDate.toISOString() });
            setShowCategoryModal(true);
        } else {
            // Build the new Task
            const newTask = {
                text: taskInput,
                category,
                time: normalizeDuration(duration),
                date: newTaskDate.toISOString(),
            };

            // Check for conflicts
            const conflicts = getConflictingTasks(new Date(newTask.date), newTask.time, tasks);
            if (conflicts.length > 0) {
                const proceed = await showConflictsAlert(newTask, conflicts);
                if (!proceed) return; // user canceled
            }

            // If proceed or no conflict
            const result = await addTask(newTask, token);
            if (result._id) {
                setTasks((prev) => [...prev, result]);
                setTaskInput('');
            } else {
                Alert.alert('Error', result.error || 'Failed to add task');
            }
        }
    };

    const confirmConflict = () => {
        return new Promise((resolve) => {
            Alert.alert(
                'Time Conflict',
                'This task overlaps with an existing task. Would you like to schedule it anyway?',
                [
                    { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                    { text: 'Align Anyway', onPress: () => resolve(true) },
                ],
                { cancelable: false }
            );
        });
    };

    const isSameUTCDate = (date1, date2) => {
        return (
            date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate()
        );
    };

    const durationToMilliseconds = (duration) => {
        if (duration === 'DEFAULT') duration = 'DEFAULT';
        const [hours, minutes] = duration.split(':').map(Number);
        return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
    };

    const checkTimeConflict = (newStart, duration, existingTasks) => {
        const newEnd = new Date(newStart.getTime() + durationToMilliseconds(duration));
        for (const task of existingTasks) {
            const taskStart = new Date(task.date);
            if (!isSameUTCDate(newStart, taskStart)) continue;

            const taskDuration = task.time;
            const taskEnd = new Date(taskStart.getTime() + durationToMilliseconds(taskDuration));

            if (newStart < taskEnd && taskStart <= newEnd) {
                return true;
            }
        }
        return false;
    };

    const handleManualCategory = async (selectedCategory) => {
        const timeMatch = currentTask.text.match(/(\d+)\s*(min|minutes|hour|hours)/i);
        const estimatedTime = timeMatch ? normalizeDuration(timeMatch[0]) : "DEFAULT";
        const newTask = {
            text: currentTask.text,
            category: selectedCategory,
            time: estimatedTime,
            date: currentTask.date,
        };

        // Check conflicts
        const conflicts = getConflictingTasks(new Date(newTask.date), newTask.time, tasks);
        if (conflicts.length > 0) {
            const proceed = await showConflictsAlert(newTask, conflicts);
            if (!proceed) {
                setShowCategoryModal(false);
                setCurrentTask(null);
                return;
            }
        }

        // Add if user agrees or no conflict
        const result = await addTask(newTask, token);
        if (result._id) {
            setTasks((prev) => [...prev, result]);
            setShowCategoryModal(false);
            setCurrentTask(null);
            setTaskInput('');
        } else {
            Alert.alert('Error', result.error || 'Failed to add task');
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditTaskInput(task.text);
        setEditCategory(task.category);
        setRecurrenceType(task.recurrence?.type || 'none');
        setRecurrenceDays(task.recurrence?.daysOfWeek || []);
        setRecurrenceInterval(task.recurrence?.interval || 1);
        setRecurrenceEndType(task.recurrence?.endType || 'never');
        setRecurrenceEndDate(task.recurrence?.endDate ? new Date(task.recurrence.endDate) : '');
        setRecurrenceOccurrences(task.recurrence?.occurrences || 1);

        const taskDate = new Date(task.date);
        const hour24 = taskDate.getUTCHours();
        const amPm = hour24 >= 12 ? "PM" : "AM";
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

        setEditHour(hour12.toString());
        setEditMinute(taskDate.getUTCMinutes().toString().padStart(2, '0'));
        setEditAmPm(amPm);

        const duration = task.completionTime || task.time;
        if (duration && duration.includes(':')) {
            const [cHour, cMinute] = duration.split(':');
            setEditCompletionHour(String(Number(cHour)));
            setEditCompletionMinute(cMinute);
        } else {
            setEditCompletionHour("0");
            setEditCompletionMinute("0");
        }

        const yyyy = taskDate.getUTCFullYear();
        const mm = (taskDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const dd = taskDate.getUTCDate().toString().padStart(2, '0');
        setEditDate(`${yyyy}-${mm}-${dd}`);
    };

    const handleDateSelect = (day) => {
        setEditDate(day.dateString);
    };

    const saveEditedTask = async () => {
        const taskToEdit = editingTask;
        if (!taskToEdit) return;

        const [year, month, day] = editDate.split('-');
        let hour = Number(editHour);
        if (editAmPm === "PM" && hour < 12) hour += 12;
        if (editAmPm === "AM" && hour === 12) hour = 0;
        const updatedDate = new Date(Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            hour,
            Number(editMinute),
            0
        ));

        const updatedTask = {
            ...taskToEdit,
            text: editTaskInput,
            date: updatedDate.toISOString(),
            category: editCategory,
            time: `${editCompletionHour.padStart(2, '0')}:${editCompletionMinute.padStart(2, '0')}`,
            recurrence: recurrenceType !== 'none' ? {
                type: recurrenceType,
                daysOfWeek: recurrenceDays,
                interval: recurrenceInterval,
                endType: recurrenceEndType,
                endDate: recurrenceEndType === 'date' ? recurrenceEndDate : null,
                occurrences: recurrenceEndType === 'count' ? recurrenceOccurrences : null
            } : null,
            isRecurring: recurrenceType !== 'none'
        };


        try {
            // We exclude the current task from the conflict check
            const otherTasks = tasks.filter(t => t._id !== taskToEdit._id);

            // See if it conflicts
            const conflicts = getConflictingTasks(
                new Date(updatedTask.date),
                updatedTask.time,
                otherTasks
            );
            if (conflicts.length > 0) {
                const proceed = await showConflictsAlert(updatedTask, conflicts);
                if (!proceed) return;
            }

            // If no conflict or user proceeds
            const result = await updateTask(taskToEdit._id, updatedTask, token);
            if (result._id) {
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task._id === taskToEdit._id ? result : task
                    )
                );
                setEditingTask(null);
            } else {
                Alert.alert('Error', result.error || 'Failed to update task');
            }
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const handleDeleteTask = async () => {
        const taskToDelete = editingTask;
        if (!taskToDelete) return;
        const result = await deleteTask(taskToDelete._id, token);
        if (result.success) {
            setTasks((prevTasks) =>
                prevTasks.filter((task) => task._id !== taskToDelete._id)
            );
            setEditingTask(null);
        } else {
            Alert.alert('Error', result.error || 'Failed to delete task');
        }
    };

    const groupTasksByDate = () => {
        const expandedTasks = tasks.flatMap(task => generateRecurringTasks(task));

        const grouped = expandedTasks.reduce((acc, task) => {
            const dateKey = getLocalDateKey(task.date);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
        }, {});

        return Object.entries(grouped)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, items]) => ({
                title: formatSectionDate(date),
                data: items.sort((a, b) => new Date(a.date) - new Date(b.date)),
            }));
    };

    const getMarkedDates = () => {
        return tasks.reduce((acc, task) => {
            const date = getLocalDateKey(task.date);
            acc[date] = { marked: true };
            return acc;
        }, {});
    };

    // For converting HH:MM to total minutes
    const timeToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };


    // Feedback handling
    const handleFeedback = (item) => {
        setFeedbackTask(item);
        setAwaitingCorrection(false);
        setCorrectedDuration("");
        setFeedbackModalVisible(true);
    };

    const submitFeedback = async (isAccurate) => {
        if (!feedbackTask) return;
        const predictedMinutes = timeToMinutes(feedbackTask.time);
        let userDuration = predictedMinutes;
        let updatedTask = { ...feedbackTask, predicted: false };

        if (!isAccurate) {
            const corrected = parseInt(correctedDuration, 10);
            if (!isNaN(corrected)) {
                userDuration = corrected;
                const hrs = Math.floor(corrected / 60);
                const mins = corrected % 60;
                updatedTask.time = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            }
        }

        // Send feedback to ML (optional for your environment)
        try {
            const response = await fetch('https://align-cvy6.onrender.com/ml/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: feedbackTask.user,
                    category: feedbackTask.category,
                    predicted_duration: predictedMinutes,
                    user_duration: userDuration,
                }),
            });
            const data = await response.json();
            console.log('Feedback response:', data);
        } catch (error) {
            console.error('Feedback error:', error);
        }

        // Update the task in DB and local state
        const result = await updateTask(feedbackTask._id, updatedTask, token);
        if (result._id) {
            setTasks(prevTasks =>
                prevTasks.map(task => (task._id === result._id ? result : task))
            );
        } else {
            Alert.alert('Error', 'Failed to update task with feedback');
        }

        setFeedbackModalVisible(false);
        setFeedbackTask(null);
    };

    const renderTaskItem = ({ item, index, showFullDate }) => (
        <TouchableOpacity onPress={() => handleEditTask(item)}>
            <View style={styles.taskItem}>
                <Text style={styles.taskText}>{item.text}</Text>
                <View style={styles.timeRangeContainer}>
                    <Text style={styles.timeRangeText}>
                        🕒 {formatTaskTime(item.date)}
                    </Text>
                    <Text style={styles.timeRangeText}>
                        → 🕒 {calculateEndTime(item.date, item.completionTime || item.time)}
                    </Text>
                </View>
                <View style={styles.taskDetails}>
                    <Text style={[styles.categoryLabel, { backgroundColor: getCategoryColor(item.category) }]}>
                        {item.category.toLowerCase()}
                    </Text>
                    <Text style={styles.timeText}>⏱ {formatDuration(item.completionTime || item.time)}</Text>
                    {item.predicted && (
                        <Text style={{ marginLeft: 10, fontSize: 12, color: 'purple' }}>🤖 Predicted</Text>
                    )}
                </View>
                {item.predicted && (
                    <TouchableOpacity
                        style={styles.feedbackTriggerButton}
                        onPress={() => handleFeedback(item)}
                    >
                        <Text style={styles.feedbackTriggerButtonText}>Was Align AI accurate?</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderTasks = () => {
        switch (activeView) {
            case 'tasks':
                return (
                    <AddTaskTab
                        taskInput={taskInput}
                        setTaskInput={setTaskInput}
                        handleAddTask={handleAddTask}
                        tasks={tasks}
                        renderTaskItem={renderTaskItem}
                    />
                );
            case 'list':
                return (
                    <ListViewTab
                        groupTasksByDate={groupTasksByDate}
                        renderTaskItem={renderTaskItem}
                    />
                );
            case 'calendar':
                return (
                    <CalendarViewTab
                        getMarkedDates={getMarkedDates}
                        setSelectedDate={setSelectedDate}
                        selectedDate={selectedDate}
                        tasks={tasks}
                        renderTaskItem={renderTaskItem}
                        getLocalDateKey={getLocalDateKey}
                    />
                );
        }
    };

    const feedbackModalOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (feedbackModalVisible) {
            Animated.timing(feedbackModalOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [feedbackModalVisible]);

    const renderFeedbackModal = () => (
        <Modal visible={feedbackModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
                <Animated.View style={[styles.feedbackModalContent, { opacity: feedbackModalOpacity }]}>
                    {feedbackTask && (
                        <>
                            <Text style={styles.feedbackModalTitle}>ALIGN AI</Text>
                            <Text style={styles.feedbackInfoText}>
                                {`The predicted duration is: \n ${
                                    (() => {
                                        const [h, m] = feedbackTask.time.split(':').map(Number);
                                        return (h ? `${h} hour${h > 1 ? 's' : ''}` : '')
                                            + (h && m ? ' ' : '')
                                            + (m ? `${m} minute${m > 1 ? 's' : ''}` : '');
                                    })()
                                }`}
                            </Text>
                            {!awaitingCorrection ? (
                                <>
                                    <Text style={styles.feedbackQuestion}>Is Align AI's guess accurate?</Text>
                                    <View style={styles.feedbackButtonRow}>
                                        <TouchableOpacity
                                            style={styles.feedbackButton}
                                            onPress={() => submitFeedback(true)}
                                        >
                                            <Text style={styles.feedbackButtonText}>Yes</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.feedbackButton}
                                            onPress={() => setAwaitingCorrection(true)}
                                        >
                                            <Text style={styles.feedbackButtonText}>No, Update</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <TextInput
                                        style={[styles.input, { marginTop: 10 }]}
                                        placeholder="Enter duration in minutes"
                                        keyboardType="numeric"
                                        value={correctedDuration}
                                        onChangeText={setCorrectedDuration}
                                    />
                                    <TouchableOpacity
                                        style={[styles.feedbackButton, { marginTop: 10 }]}
                                        onPress={() => submitFeedback(false)}
                                    >
                                        <Text style={styles.feedbackButtonText}>Submit Correction</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity
                                style={styles.feedbackCancelButton}
                                onPress={() => {
                                    setFeedbackModalVisible(false);
                                    setFeedbackTask(null);
                                }}
                            >
                                <Text style={styles.feedbackCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            {/* Category selection modal */}
            <Modal visible={showCategoryModal} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={styles.categoryButton}
                                onPress={() => handleManualCategory(cat)}
                            >
                                <Text style={styles.categoryText}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Task editing modal */}
            <Modal visible={editingTask !== null} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.editModalContent}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setEditingTask(null)}
                            hitSlop={{ top: 100, bottom: 100, left: 100, right: 100 }}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.modalTitle}>Edit Task</Text>
                            <Text style={styles.label}>Original Input</Text>
                            <TextInput
                                style={styles.input}
                                value={editTaskInput}
                                onChangeText={setEditTaskInput}
                                placeholder="Edit your task text here"
                            />
                            <Text style={styles.label}>Category</Text>
                            {/* Recurrence Settings */}
                            <Text style={styles.label}>Recurrence Pattern</Text>
                            <Picker
                                selectedValue={recurrenceType}
                                onValueChange={setRecurrenceType}
                                style={styles.input}>
                                <Picker.Item label="No Recurrence" value="none" />
                                <Picker.Item label="Daily" value="daily" />
                                <Picker.Item label="Weekly" value="weekly" />
                                <Picker.Item label="Monthly" value="monthly" />
                                <Picker.Item label="Yearly" value="yearly" />
                                <Picker.Item label="Custom Days" value="custom" />
                            </Picker>

                            {recurrenceType === 'weekly' || recurrenceType === 'custom' ? (
                                <View style={styles.recurrenceDaysContainer}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.dayButton,
                                                recurrenceDays.includes(index) && styles.selectedDay
                                            ]}
                                            onPress={() => {
                                                const updatedDays = [...recurrenceDays];
                                                const dayIndex = updatedDays.indexOf(index);
                                                if (dayIndex === -1) {
                                                    updatedDays.push(index);
                                                } else {
                                                    updatedDays.splice(dayIndex, 1);
                                                }
                                                setRecurrenceDays(updatedDays);
                                            }}>
                                            <Text style={styles.dayText}>{day}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : null}

                            <Text style={styles.label}>Repeat Every:</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={String(recurrenceInterval)}
                                onChangeText={text => setRecurrenceInterval(Number(text) || 1)}
                            />

                            <Text style={styles.label}>Ends:</Text>
                            <Picker
                                selectedValue={recurrenceEndType}
                                onValueChange={setRecurrenceEndType}
                                style={styles.input}>
                                <Picker.Item label="Never" value="never" />
                                <Picker.Item label="On Date" value="date" />
                                <Picker.Item label="After Occurrences" value="count" />
                            </Picker>

                            {recurrenceEndType === 'date' && (
                                <DateTimePicker
                                    value={recurrenceEndDate || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => setRecurrenceEndDate(date)}
                                />
                            )}

                            {recurrenceEndType === 'count' && (
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="Number of occurrences"
                                    value={String(recurrenceOccurrences)}
                                    onChangeText={text => setRecurrenceOccurrences(Number(text))}
                                />
                            )}
                            <Picker
                                selectedValue={editCategory}
                                onValueChange={(itemValue) => setEditCategory(itemValue)}
                                style={{ height: 200, width: '100%' }}
                                mode="dropdown"
                            >
                                {categories.map((cat) => (
                                    <Picker.Item key={cat} label={cat} value={cat} />
                                ))}
                            </Picker>
                            <Text style={styles.label}>Select Date</Text>
                            <Calendar
                                current={editDate}
                                onDayPress={handleDateSelect}
                                markedDates={{
                                    [editDate]: { selected: true },
                                }}
                                theme={{
                                    todayTextColor: '#007aff',
                                    selectedDayBackgroundColor: '#007aff',
                                    arrowColor: '#007aff',
                                }}
                            />
                            <Text style={styles.label}>Scheduled Time</Text>
                            <View style={styles.timePickerContainer}>
                                <View style={styles.pickerColumn}>
                                    <Text style={styles.pickerLabel}>Hours</Text>
                                    <Picker
                                        selectedValue={editHour}
                                        style={{ height: 200, width: 100 }}
                                        onValueChange={(itemValue) => setEditHour(itemValue)}
                                        mode="dropdown"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <Picker.Item key={i + 1} label={(i + 1).toString()} value={(i + 1).toString()} />
                                        ))}
                                    </Picker>
                                </View>
                                <View style={styles.pickerColumn}>
                                    <Text style={styles.pickerLabel}>Minutes</Text>
                                    <Picker
                                        selectedValue={editMinute}
                                        style={{ height: 200, width: 100 }}
                                        onValueChange={(itemValue) => setEditMinute(itemValue)}
                                        mode="dropdown"
                                    >
                                        {Array.from({ length: 60 }, (_, i) => (
                                            <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString()} />
                                        ))}
                                    </Picker>
                                </View>
                                <View style={styles.pickerColumn}>
                                    <Text style={styles.pickerLabel}>AM/PM</Text>
                                    <Picker
                                        selectedValue={editAmPm}
                                        style={{ height: 200, width: 100 }}
                                        onValueChange={(itemValue) => setEditAmPm(itemValue)}
                                        mode="dropdown"
                                    >
                                        <Picker.Item label="AM" value="AM" />
                                        <Picker.Item label="PM" value="PM" />
                                    </Picker>
                                </View>
                            </View>
                            <Text style={styles.label}>Completion Time</Text>
                            <View style={styles.timePickerContainer}>
                                <View style={styles.pickerColumn}>
                                    <Text style={styles.pickerLabel}>Hours</Text>
                                    <Picker
                                        selectedValue={editCompletionHour}
                                        style={{ height: 200, width: 100 }}
                                        onValueChange={(itemValue) => setEditCompletionHour(itemValue)}
                                        mode="dropdown"
                                    >
                                        {Array.from({ length: 25 }, (_, i) => (
                                            <Picker.Item key={i} label={i.toString()} value={i.toString()} />
                                        ))}
                                    </Picker>
                                </View>
                                <View style={styles.pickerColumn}>
                                    <Text style={styles.pickerLabel}>Minutes</Text>
                                    <Picker
                                        selectedValue={editCompletionMinute}
                                        style={{ height: 200, width: 100 }}
                                        onValueChange={(itemValue) => setEditCompletionMinute(itemValue)}
                                        mode="dropdown"
                                    >
                                        {Array.from({ length: 60 }, (_, i) => (
                                            <Picker.Item key={i} label={i.toString()} value={i.toString()} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={styles.formActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.saveButton]}
                                    onPress={saveEditedTask}
                                >
                                    <Text style={styles.actionButtonText}>Save Changes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={handleDeleteTask}
                                >
                                    <Text style={styles.actionButtonText}>Delete Task</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {renderTasks()}
            {renderFeedbackModal()}

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabButton, activeView === 'tasks' && styles.activeTab]}
                    onPress={() => setActiveView('tasks')}
                >
                    <Text style={styles.tabText}>Add Task</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeView === 'list' && styles.activeTab]}
                    onPress={() => setActiveView('list')}
                >
                    <Text style={styles.tabText}>List View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeView === 'calendar' && styles.activeTab]}
                    onPress={() => setActiveView('calendar')}
                >
                    <Text style={styles.tabText}>Calendar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export { formatSectionDate, formatTaskDate, formatTaskTime };