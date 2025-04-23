// app/taskManagment.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    // Button, // No longer used directly
    Modal,
    TouchableWithoutFeedback,
    TouchableOpacity,
    FlatList,
    // SectionList, // No longer used directly
    ScrollView,
    Alert,
    Animated,
    Platform, Switch, // Import Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles, getCategoryColor } from './styles';
import AddTaskTab from '../components/addTask';
import ListViewTab from '../components/listView';
import CalendarViewTab from '../components/calendar';
import {
    categorizeTask,
    parseTaskDetails,
    getTasks,
    addTask,
    updateTask,
    deleteTask,
} from '../constants/api';
import { generateRecurringTasks } from '../constants/recurrence';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from "expo-notifications";
import {cancelTaskReminder, registerForPushNotificationsAsync, scheduleTaskReminder} from "../constants/notifications";
import {BlurView} from "expo-blur";

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

// --- HELPER FUNCTIONS (Keep existing helpers: normalizeDuration, formatTaskTime, formatCompletionTime, formatDuration, calculateEndTime, formatSectionDate, formatTaskDate, isSameLocalDate, durationToMilliseconds) ---
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

    // State for Edit Modal fields
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState(new Date());
    const [showEditTimePicker, setShowEditTimePicker] = useState(false);
    const [editCategory, setEditCategory] = useState('');
    const [editTaskInput, setEditTaskInput] = useState('');
    const [editDuration, setEditDuration] = useState('01:00');
    const [showDurationPicker, setShowDurationPicker] = useState(false);
    const [tempDurationHours, setTempDurationHours] = useState('1');
    const [tempDurationMinutes, setTempDurationMinutes] = useState('0');

    // Recurrence State
    const [recurrenceType, setRecurrenceType] = useState('none');
    const [recurrenceDays, setRecurrenceDays] = useState([]);
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceEndType, setRecurrenceEndType] = useState('never');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
    const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(null);

    // Feedback Modal State
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackTask, setFeedbackTask] = useState(null);
    const [awaitingCorrection, setAwaitingCorrection] = useState(false);
    const [correctedDuration, setCorrectedDuration] = useState("");

    // Picker Modals State
    const [showRecurrenceTypePicker, setShowRecurrenceTypePicker] = useState(false);
    const [showRecurrenceEndTypePicker, setShowRecurrenceEndTypePicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const menuAnimation = useRef(new Animated.Value(0)).current;

    const [editReminderEnabled, setEditReminderEnabled] = useState(false);
    const [editReminderOffset, setEditReminderOffset] = useState(0);

    useEffect(() => {
        Notifications.getPermissionsAsync()
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const { screen, date } = response.notification.request.content.data;
            if (screen === 'Calendar') {
                setActiveView('calendar');
                setSelectedDate(date);
            }
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        // Add this useEffect hook in your component
        const setupNotifications = async () => {
            // Configure notification handler
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Check initial notification permission status
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Notifications Blocked',
                    'Please enable notifications in settings to receive reminders',
                    [{ text: 'OK', onPress: () => {} }]
                );
            }
        };

        setupNotifications();
    }, []);

    // Add this effect
    useEffect(() => {
        Animated.timing(menuAnimation, {
            toValue: showSettingsMenu ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showSettingsMenu]);

    // Add this function
    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        router.replace('/login');
    };

    // Add this function
    const handleCreateNewAccount = async () => {
        await AsyncStorage.removeItem('token');
        router.replace('/register');
    };


    const feedbackModalOpacity = useRef(new Animated.Value(0)).current;

    // ---------------------------
    // NEW CROSS-OFF RELATED STATE
    // ---------------------------
    // 1) A ref that holds each task's Animated.Value for line width
    const crossOffRefs = useRef({});
    // 2) A map that tells if a task is currently crossed off
    const [crossedOffMap, setCrossedOffMap] = useState({});

    // 3) Store measured text widths so we know how far to animate
    const [textWidths, setTextWidths] = useState({});

    // Utility: toggles a cross-off animation for a single item
    const handleCrossOff = (item) => {
        const id = item._id || `local_${item.text}`;
        const currentlyCrossed = crossedOffMap[id] === true;

        if (!crossOffRefs.current[id]) {
            crossOffRefs.current[id] = {
                lineAnim: new Animated.Value(0),
                textOpacity: new Animated.Value(1),
                scaleAnim: new Animated.Value(1)
            };
        }

        const { lineAnim, textOpacity, scaleAnim } = crossOffRefs.current[id];
        const finalWidth = textWidths[id] || 0;

        if (!currentlyCrossed) {
            Animated.parallel([
                Animated.spring(lineAnim, {
                    toValue: finalWidth,
                    speed: 80,
                    bounciness: 10,
                    useNativeDriver: false,
                }),
                Animated.timing(textOpacity, {
                    toValue: 0.3,
                    duration: 250,
                    useNativeDriver: false,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1.02,
                    speed: 110,
                    useNativeDriver: false,
                })
            ]).start(({ finished }) => {
                if (finished) {
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        useNativeDriver: false,
                    }).start();
                    setCrossedOffMap(prev => ({ ...prev, [id]: true }));
                }
            });
        } else {
            Animated.parallel([
                Animated.spring(lineAnim, {
                    toValue: 0,
                    speed: 80,
                    bounciness: 10,
                    useNativeDriver: false,
                }),
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 0.98,
                    speed: 110,
                    useNativeDriver: false,
                })
            ]).start(({ finished }) => {
                if (finished) {
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        useNativeDriver: false,
                    }).start();
                    setCrossedOffMap(prev => ({ ...prev, [id]: false }));
                }
            });
        }
    };


    useEffect(() => {
        if (feedbackModalVisible) {
            Animated.timing(feedbackModalOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [feedbackModalVisible]);

    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                await registerForPushNotificationsAsync();
                const storedToken = await AsyncStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                    const tasksFromApi = await getTasks(storedToken);
                    if (Array.isArray(tasksFromApi)) {
                        setTasks(tasksFromApi);
                    } else {
                        setTasks([]);
                        console.error("Failed to load tasks or tasks format incorrect");
                    }
                } else {
                    router.replace('/');
                }
                const stored = await AsyncStorage.getItem('manualTask');
                if (stored) {
                    const manualTask = JSON.parse(stored);
                    setCurrentTask(manualTask);
                    setShowCategoryModal(true);
                    await AsyncStorage.removeItem('manualTask');
                }
            };
            loadData();
        }, [router])
    );

    const getLocalDateKey = (dateStr) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
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

    const handleAddTask = async () => {
        if (!taskInput.trim()) return;
        try {
            console.log(`Parsing input: "${taskInput.trim()}"`);
            const details = await parseTaskDetails(taskInput.trim());
            console.log("Parsed details:", details);

            const { category, scheduled_date, scheduled_time, duration, recurrence, text_content } = details;

            if (!scheduled_date || !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
                Alert.alert("Invalid Input", `Could not determine a valid date (YYYY-MM-DD) from input. Found: ${scheduled_date || 'None'}`);
                console.error("Invalid scheduled_date format:", scheduled_date);
                return;
            }
            if (!scheduled_time || !/^\d{2}:\d{2}$/.test(scheduled_time)) {
                Alert.alert("Invalid Input", `Could not determine a valid time (HH:MM) from input. Found: ${scheduled_time || 'None'}`);
                console.error("Invalid scheduled_time format:", scheduled_time);
                return;
            }

            const [yearStr, monthStr, dayStr] = scheduled_date.split('-');
            const [hourStr, minuteStr] = scheduled_time.split(':');

            const year = Number(yearStr);
            const month = Number(monthStr);
            const day = Number(dayStr);
            const hour = Number(hourStr);
            const minute = Number(minuteStr);

            if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
                Alert.alert("Invalid Input", "Parsed date or time components are not valid numbers.");
                console.error("NaN component(s):", { year, month, day, hour, minute });
                return;
            }
            if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || year < 1900 || year > 2100) {
                Alert.alert("Invalid Date/Time Range", "The parsed date or time seems incorrect (e.g., invalid month, day, hour).");
                console.error("Basic range validation failed:", { year, month, day, hour, minute });
                return;
            }

            if (!isValidDate(year, month, day)) {
                Alert.alert("Invalid Date", `The date ${year}-${monthStr}-${dayStr} does not exist.`);
                console.error("isValidDate check failed for:", { year, month, day });
                return;
            }

            const taskDateUTC = new Date(year, month - 1, day, hour, minute, 0);
            if (isNaN(taskDateUTC.getTime())) {
                Alert.alert("Internal Error", "Failed to create date object even after validation.");
                console.error("Internal Error: new Date() resulted in Invalid Date:", { year, month, day, hour, minute });
                return;
            }
            const newTaskDateISO = taskDateUTC.toISOString();

            const normalizedDur = normalizeDuration(duration);

            let taskData = {
                text: text_content || taskInput.trim(),
                time: normalizedDur,
                date: newTaskDateISO,
                recurrence: recurrence || { type: 'none' },
                isRecurring: recurrence && recurrence.type !== 'none',
                predicted: details.predicted_duration != null
            };

            if (category === 'MANUAL') {
                setCurrentTask(taskData);
                setShowCategoryModal(true);
            } else {
                taskData.category = category;
                await processAndAddTask(taskData);
                setTaskInput('');
            }
        } catch (error) {
            console.error("Error parsing/adding task:", error, error.stack);
            Alert.alert('Error', `Failed to process task: ${error.message}`);
        }
    };

    const handleManualCategory = async (selectedCategory) => {
        if (!currentTask) return;

        const taskWithCategory = {
            ...currentTask,
            category: selectedCategory,
        };

        setShowCategoryModal(false);
        setCurrentTask(null);
        await processAndAddTask(taskWithCategory);
        setTaskInput('');
    };

    const processAndAddTask = async (newTaskData) => {
        try {
            const conflicts = await getConflictingTasks(new Date(newTaskData.date), newTaskData.time, tasks);

            if (conflicts.length > 0) {
                const decision = await showConflictsAlert(newTaskData, conflicts);
                if (decision === "cancel") return;
                if (decision === "smart") {
                    const smartAlignedTask = await smartAlignTask(newTaskData, tasks);
                    if (!smartAlignedTask) return;
                    newTaskData = smartAlignedTask;
                }
            }

            const result = await addTask(newTaskData, token);
            if (result && result._id) {
                // ⬇️ After adding the task, schedule the reminder and STORE the notification ID
                let updatedTask = { ...result };
                if (updatedTask.reminderEnabled) {
                    const notificationId = await scheduleTaskReminder(updatedTask);
                    if (notificationId) {
                        updatedTask.notificationId = notificationId;
                    }
                }

                // ⬇️ Now put updatedTask in state (with notificationId included!)
                setTasks((prev) =>
                    [...prev, updatedTask].sort((a, b) => new Date(a.date) - new Date(b.date))
                );
            } else {
                Alert.alert('Error', result?.error || 'Failed to add task to database');
            }

        } catch (error) {
            console.error("Error processing/adding task:", error);
            Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
        }
    };


    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditTaskInput(task.text);
        setEditCategory(task.category);

        const taskDateUTCBased = new Date(task.date);

        const localYear = taskDateUTCBased.getFullYear();
        const localMonth = taskDateUTCBased.getMonth();
        const localDay = taskDateUTCBased.getDate();
        const localHour = taskDateUTCBased.getHours();
        const localMinute = taskDateUTCBased.getMinutes();

        setEditReminderEnabled(task.reminderEnabled || false);
        setEditReminderOffset(task.reminderOffset || 0);

        const utcYearForCalendar = taskDateUTCBased.getFullYear();
        const utcMonthForCalendar = (taskDateUTCBased.getMonth() + 1).toString().padStart(2, '0');
        const utcDayForCalendar = taskDateUTCBased.getDate().toString().padStart(2, '0');
        setEditDate(`${utcYearForCalendar}-${utcMonthForCalendar}-${utcDayForCalendar}`);

        const initialPickerTime = new Date(
            localYear,
            localMonth,
            localDay,
            localHour,
            localMinute,
            0,
            0
        );

        console.log("--- Editing Task (Revised Initialization) ---");
        console.log("Original UTC ISO:", task.date);
        console.log("Parsed Original Date Object:", taskDateUTCBased.toString());
        console.log("Derived Local Components:", { localYear, localMonth, localDay, localHour, localMinute });
        console.log("Constructed initialPickerTime Object:", initialPickerTime.toString());
        console.log("Calendar Date String Set To:", editDate);

        setEditTime(initialPickerTime);

        const taskDuration = task.completionTime || task.time || '01:00';
        setEditDuration(taskDuration);
        const [h, m] = (task.time || '01:00').split(':').map(Number);
        setTempDurationHours(h.toString());
        setTempDurationMinutes(m.toString().padStart(2, '0'));

        setRecurrenceType(task.recurrence?.type || 'none');
        setRecurrenceDays(task.recurrence?.daysOfWeek || []);
        setRecurrenceInterval(task.recurrence?.interval || 1);
        setRecurrenceEndType(task.recurrence?.endType || 'never');

        let initialRecurrenceEndDate = new Date();
        if (task.recurrence?.endDate) {
            try {
                if (/^\d{4}-\d{2}-\d{2}$/.test(task.recurrence.endDate)) {
                    const [rYear, rMonth, rDay] = task.recurrence.endDate.split('-').map(Number);
                    initialRecurrenceEndDate = new Date((rYear, rMonth - 1, rDay));
                } else {
                    const parsedDate = new Date(task.recurrence.endDate);
                    if (!isNaN(parsedDate.getTime())) {
                        initialRecurrenceEndDate = parsedDate;
                    }
                }
            } catch (e) {
                console.error("Error parsing recurrence end date:", task.recurrence.endDate, e);
            }
        }
        setRecurrenceEndDate(initialRecurrenceEndDate);
        setRecurrenceOccurrences(task.recurrence?.occurrences || null);
    };

    const onEditDateSelect = (day) => {
        setEditDate(day.dateString);
    };

    const onEditTimeChange = (event, selectedDate) => {
        const currentDate = selectedDate || editTime;
        setShowEditTimePicker(Platform.OS === 'ios');
        setEditTime(currentDate);
    };

    const onEditDurationChange = () => {
        const hours = parseInt(tempDurationHours, 10) || 0;
        const minutes = parseInt(tempDurationMinutes, 10) || 0;
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        setEditDuration(formatted);
        setShowDurationPicker(false);
    };

    const saveEditedTask = async () => {
        const taskToEdit = editingTask;
        if (!taskToEdit) return;

        const [year, month, day] = editDate.split('-').map(Number);

        const hour = editTime.getHours();
        const minute = editTime.getMinutes();

        const updatedDateUTC = new Date(year, month - 1, day, hour, minute, 0);

        const duration = `${tempDurationHours.padStart(2,'0')}:${tempDurationMinutes.padStart(2,'0')}`;

        if (isNaN(updatedDateUTC.getTime())) {
            Alert.alert("Invalid Date/Time", "Please ensure the date and time are set correctly after combining.");
            console.error("Failed to construct valid Date object from:", { year, month, day, hour, minute });
            return;
        }

        const finalDateISO = updatedDateUTC.toISOString();
        console.log("--- Saving Edited Task ---");
        console.log("Selected Date String:", editDate);
        console.log("Selected Time State (Local):", editTime.toString());
        console.log("Constructed UTC Date:", updatedDateUTC.toString());
        console.log("Final ISO String to save:", finalDateISO);

        const isRecurringInstance = taskToEdit.originalTask !== undefined;

        let updatedTaskData = {
            ...taskToEdit,
            text: editTaskInput,
            date: finalDateISO,
            category: editCategory,
            time: editDuration,
            reminderEnabled: editReminderEnabled,  // Add reminder fields
            reminderOffset: editReminderOffset,
            completionTime: editDuration,
            recurrence: recurrenceType !== 'none' ? {

                type: recurrenceType,

                daysOfWeek: (recurrenceType === 'weekly' || recurrenceType === 'custom') ? recurrenceDays : undefined,

                interval: recurrenceInterval >= 1 ? recurrenceInterval : 1,

                endType: recurrenceEndType,

                endDate: recurrenceEndType === 'date'

                    ? (recurrenceEndDate

                        ? recurrenceEndDate.toISOString().split('T')[0]

                        : undefined)

                    : undefined,

                occurrences: recurrenceEndType === 'count'

                    ? (recurrenceOccurrences > 0 ? recurrenceOccurrences : undefined)

                    : undefined

            } : null,

            isRecurring: recurrenceType !== 'none',

            predicted: false,

        };


        try {
            const otherTasks = tasks.filter(t => t._id !== taskToEdit._id);
            const conflicts = await getConflictingTasks(updatedDateUTC, updatedTaskData.time, otherTasks);

            if (conflicts.length > 0) {
                const decision = await showConflictsAlert(updatedTaskData, conflicts);
                if (decision === "cancel") {
                    return;
                } else if (decision === "smart") {
                    const smartAlignedTask = await smartAlignTask(updatedTaskData, otherTasks);
                    if (smartAlignedTask) {
                        updatedTaskData.date = smartAlignedTask.date;
                        console.log("Smart Align updated date to:", updatedTaskData.date);
                    } else {
                        return;
                    }
                }
            }

            const taskIdToUpdate = isRecurringInstance
                ? taskToEdit.originalTask
                : taskToEdit._id;

            const result = await updateTask(taskIdToUpdate, updatedTaskData, token);

            if (result && result._id) {
                // Cancel existing notification if exists
                if (taskToEdit.notificationId) {
                    await cancelTaskReminder(taskToEdit.notificationId);
                }

                // Schedule new reminder if enabled
                let notificationId;
                if (result.reminderEnabled) {
                    notificationId = await scheduleTaskReminder(result);
                }

                // Update task with new notification ID
                const updatedTask = {
                    ...result,
                    notificationId: notificationId || null
                };

                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task._id === taskToEdit._id ? updatedTask : task
                    ).sort((a, b) => new Date(a.date) - new Date(b.date))
                );
                setEditingTask(null);
            }

        } catch (error) {
            console.error('Save edited task error:', error);
            Alert.alert('Error', 'Failed to save changes: ${error.message}');
        }
    };

    const handleDeleteTask = async () => {
        const taskToDelete = editingTask;
        if (!taskToDelete) return;

        Alert.alert(
            "Confirm Deletion",
            `Are you sure you want to delete "${taskToDelete.text}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        try {
                            // ⬇️ Cancel the reminder if it exists
                            if (taskToDelete.notificationId) {
                                await cancelTaskReminder(taskToDelete.notificationId);
                            }

                            // Now that we’ve canceled it locally, remove from backend
                            const result = await deleteTask(taskToDelete._id, token);
                            if (result.success) {
                                setTasks((prevTasks) =>
                                    prevTasks.filter((t) => t._id !== taskToDelete._id)
                                );
                                setEditingTask(null);
                            } else {
                                Alert.alert('Error', result.error || 'Failed to delete task');
                            }
                        } catch (error) {
                            console.error("Delete task error:", error);
                            Alert.alert('Error', `Failed to delete task: ${error.message}`);
                        }
                    }
                }
            ]
        );
    };


    const getMarkedDates = () => {
        const todayKey = new Date().toISOString().split('T')[0];
        const expandedTasks = tasks.flatMap(task => generateRecurringTasks(task));
        const markedDates = expandedTasks.reduce((acc, task) => {
            const dateKey = getLocalDateKey(task.date);
            acc[dateKey] = {
                marked: true,
                dotColor: '#000000',
            };
            return acc;
        }, {});

        markedDates[todayKey] = {
            ...(markedDates[todayKey] || {}),
            customStyles: {
                container: {
                    borderColor: '#ff6347',
                    borderWidth: 1.5,
                    borderRadius: 18,
                },
                text: {
                    color: '#ff6347',
                    fontWeight: 'bold',
                },
            },
        };

        if (selectedDate) {
            markedDates[selectedDate] = {
                ...(markedDates[selectedDate] || {}),
                selected: true,
                selectedColor: '#007aff',
                selectedTextColor: '#ffffff',
                customStyles: {
                    container: {
                        backgroundColor: '#007aff',
                        borderRadius: 18,
                    },
                    text: {
                        color: '#ffffff',
                        fontWeight: 'bold',
                    },
                },
            };
        }

        return markedDates;
    };

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

        if (!feedbackTask._id || !feedbackTask.user) {
            Alert.alert('Error', 'Invalid task data');
            return;
        }

        try {
            const response = await fetch('https://align-cvy6.onrender.com/ml/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: feedbackTask.user.toString(),
                    category: feedbackTask.category,
                    predicted_duration: predictedMinutes,
                    user_duration: userDuration,
                    taskId: feedbackTask._id.toString()
                }),
            });
            const data = await response.json();
            console.log('Feedback response:', data);
        } catch (error) {
            console.error('Feedback error:', error);
        }

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
    const renderFeedbackModal = () => (
        <Modal visible={feedbackModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
                <Animated.View style={[styles.feedbackModalContent, { opacity: feedbackModalOpacity }]}>
                    {feedbackTask && (
                        <>
                            <Text style={styles.feedbackModalTitle}>ALIGN AI</Text>
                            <Text style={styles.feedbackInfoText}>
                                {`The predicted duration is: ${
                                    (() => {
                                        const [h, m] = feedbackTask.time.split(':').map(Number);
                                        return (h ? `${h} hour${h > 1 ? 's' : ''}` : '') +
                                            (h && m ? ' ' : '') +
                                            (m ? `${m} minute${m > 1 ? 's' : ''}` : '');
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

    // --- Render Recurrence End Condition Picker Modal ---
    const renderRecurrenceEndTypePicker = () => (
        <Modal visible={showRecurrenceEndTypePicker} transparent animationType="slide">
            <View style={[styles.pickerModalOverlay, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
                <View style={styles.pickerModalContent}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>End Condition</Text>
                        <TouchableOpacity onPress={() => setShowRecurrenceEndTypePicker(false)}>
                            <Text style={styles.pickerDoneButton}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <Picker
                        selectedValue={recurrenceEndType}
                        onValueChange={(value) => {
                            setRecurrenceEndType(value);
                            if (value === 'date') setRecurrenceOccurrences(null);
                            if (value === 'count') setRecurrenceEndDate(new Date());
                            if (value === 'never') {
                                setRecurrenceOccurrences(null);
                                setRecurrenceEndDate(new Date());
                            }
                        }}
                    >
                        <Picker.Item label="Never Ends" value="never" />
                        <Picker.Item label="Ends On Date" value="date" />
                        <Picker.Item label="Ends After Occurrences" value="count" />
                    </Picker>
                </View>
            </View>
        </Modal>
    );

    // --- Other Modals (Category Picker, Duration Picker, etc.) ---

    // Duration Picker Modal with updated bottom-up style
    const renderDurationPicker = () => (
        <Modal visible={showDurationPicker} transparent animationType="slide">
            <View style={[styles.pickerModalOverlay, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
                <View style={styles.pickerModalContent}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Set Duration</Text>
                        <TouchableOpacity onPress={onEditDurationChange}>
                            <Text style={styles.pickerDoneButton}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                        <Picker
                            selectedValue={tempDurationHours.toString()}
                            style={{ height: 150, width: 100 }}
                            onValueChange={(itemValue) => setTempDurationHours(itemValue)}
                        >
                            {Array.from({ length: 24 }, (_, i) => i.toString()).map(hour => (
                                <Picker.Item key={`h-${hour}`} label={hour} value={hour} />
                            ))}
                        </Picker>
                        <Text style={styles.pickerLabel}>hr</Text>
                        <Picker
                            selectedValue={tempDurationMinutes.toString().padStart(2, '0')}
                            style={{ height: 150, width: 100 }}
                            onValueChange={(itemValue) => setTempDurationMinutes(itemValue)}
                        >
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2,'0')).map(min => (
                                <Picker.Item key={`m-${min}`} label={min} value={min} />
                            ))}
                        </Picker>
                        <Text style={styles.pickerLabel}>min</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Category Picker Modal with updated bottom-up style
    // (For editing task category)
    // It now uses the same overlay style as the recurrence modals.
    // ----------------------------------------
    // Note: This is separate from the manual category modal shown at the very beginning.
    // ----------------------------------------
    // When the user taps the category selection button in the edit modal.
    // ----------------------------------------
    // The modal slides from the bottom.
    // ----------------------------------------
    <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={[styles.pickerModalOverlay, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
            <View style={styles.pickerModalContent}>
                <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Category</Text>
                    <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                    </TouchableOpacity>
                </View>
                <Picker
                    selectedValue={editCategory}
                    onValueChange={(itemValue) => setEditCategory(itemValue)}
                >
                    {categories.map((cat) => (
                        <Picker.Item key={cat} label={cat} value={cat} />
                    ))}
                </Picker>
            </View>
        </View>
    </Modal>;

    const renderTaskItem = ({ item }) => {
        // Unique ID to track crossing
        const id = item._id || `local_${item.text}`;
        const isCrossed = crossedOffMap[id] === true;
        const finalWidth = textWidths[id] || 0;

        // Ensure we have all Animated.Values: lineAnim, textOpacity, and scaleAnim
        if (!crossOffRefs.current[id]) {
            crossOffRefs.current[id] = {
                lineAnim: new Animated.Value(0),
                textOpacity: new Animated.Value(1),
                scaleAnim: new Animated.Value(1)
            };
        }
        const { lineAnim, textOpacity, scaleAnim } = crossOffRefs.current[id];

        // Decide how to handle press:
        const handlePress = () => {
            if (activeView === 'tasks') {
                // We are in Manage Tasks => open the edit modal
                handleEditTask(item);
            } else {
                // We are on List or Calendar => toggle strike-through
                handleCrossOff(item);
            }
        };

        return (
            <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <View style={styles.taskItem}>
                        <View
                            style={{ alignSelf: 'flex-start' }}
                            onLayout={(e) => {
                                const w = e.nativeEvent.layout.width;
                                setTextWidths((prev) => ({ ...prev, [id]: w }));
                            }}
                        >
                            <Animated.Text
                                style={[
                                    styles.taskText,
                                    { opacity: textOpacity },
                                    isCrossed && styles.crossedText
                                ]}
                            >
                                {item.text}
                            </Animated.Text>
                            <Animated.View
                                style={[
                                    styles.crossOffLine,
                                    {
                                        width: lineAnim,
                                        backgroundColor: getCategoryColor(item.category),
                                        opacity: lineAnim.interpolate({
                                            inputRange: [0, finalWidth],
                                            outputRange: [0, 1]
                                        })
                                    }
                                ]}
                            />
                        </View>

                        <View style={styles.timeRangeContainer}>
                            <Text style={styles.timeRangeText}>
                                🕒 {formatTaskTime(item.date)}
                            </Text>
                            {item.time !== 'DEFAULT' && (
                                <Text style={styles.timeRangeText}>
                                    → {calculateEndTime(item.date, item.time)}
                                </Text>
                            )}
                        </View>

                        <View style={styles.taskDetails}>
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    {
                                        backgroundColor:
                                            item.category === 'SLEEP'
                                                ? '#000'
                                                : getCategoryColor(item.category)
                                    }
                                ]}
                            >
                                {item.category?.toLowerCase() || 'other'}
                            </Text>
                            <Text style={styles.timeText}>
                                ⏱ {formatDuration(item.completionTime || item.time)}
                            </Text>
                            {item.predicted && (
                                <Text style={{ marginLeft: 10, fontSize: 12, color: 'purple' }}>
                                    🤖 AI
                                </Text>
                            )}
                        </View>

                        {item.predicted && item.category !== 'SLEEP' && (
                            <TouchableOpacity
                                style={styles.feedbackTriggerButton}
                                onPress={() => handleFeedback(item)}
                            >
                                <Text style={styles.feedbackTriggerButtonText}>
                                    Was AI duration right?
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    };

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
                        tasks={tasks.flatMap(task => generateRecurringTasks(task))}
                        renderTaskItem={renderTaskItem}
                        getLocalDateKey={getLocalDateKey}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <Modal visible={showCategoryModal} transparent={true} animationType="fade">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <ScrollView>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={styles.categoryButton}
                                    onPress={() => handleManualCategory(cat)}
                                >
                                    <Text style={styles.categoryText}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.categoryButton, { backgroundColor: '#ccc', marginTop: 10 }]}
                            onPress={() => {
                                setShowCategoryModal(false);
                                setCurrentTask(null);
                            }}
                        >
                            <Text style={[styles.categoryText, { color: '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showSettingsMenu && (
                <TouchableWithoutFeedback onPress={() => setShowSettingsMenu(false)}>
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 9 }} />
                </TouchableWithoutFeedback>
            )}


            {/* Settings Menu */}
            <Animated.View
                style={[
                    styles.settingsMenu,
                    {
                        opacity: menuAnimation,
                        transform: [
                            { translateY: menuAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0]
                                })}
                        ],
                        zIndex: 10,  // <-- Added
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push('/dailySummarySettings')}
                >
                    <Text style={styles.notiSettingsText}>Notification Settings</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleCreateNewAccount}
                >
                    <Text style={styles.createNewAccText}>Create New Account</Text>
                </TouchableOpacity>
            </Animated.View>

            <Modal visible={editingTask !== null} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.editModalContent}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setEditingTask(null)}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <Text style={styles.modalTitle}>Edit Task</Text>
                            <Text style={styles.label}>Task Description</Text>
                            <TextInput
                                style={styles.input}
                                value={editTaskInput}
                                onChangeText={setEditTaskInput}
                                placeholder="Edit task description"
                            />

                            <View style={styles.recurrenceContainer}>
                                <Text style={styles.sectionTitle}>Recurrence</Text>
                                <TouchableOpacity
                                    style={styles.selectionButton}
                                    onPress={() => setShowRecurrenceTypePicker(true)}
                                >
                                    <Text style={styles.selectionButtonText}>
                                        {recurrenceType.charAt(0).toUpperCase() + recurrenceType.slice(1)}
                                    </Text>
                                    <Text style={styles.selectionButtonIcon}>⌄</Text>
                                </TouchableOpacity>

                                <Modal visible={showRecurrenceTypePicker} transparent animationType="slide">
                                    <View style={[styles.pickerModalOverlay, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
                                        <View style={styles.pickerModalContent}>
                                            <View style={styles.pickerHeader}>
                                                <Text style={styles.pickerTitle}>Repeat Pattern</Text>
                                                <TouchableOpacity onPress={() => setShowRecurrenceTypePicker(false)}>
                                                    <Text style={styles.pickerDoneButton}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Picker
                                                selectedValue={recurrenceType}
                                                onValueChange={(value) => {
                                                    setRecurrenceType(value);
                                                    if (value === 'none') setRecurrenceEndType('never');
                                                }}
                                            >
                                                <Picker.Item label="No Recurrence" value="none" />
                                                <Picker.Item label="Daily" value="daily" />
                                                <Picker.Item label="Weekly" value="weekly" />
                                                <Picker.Item label="Monthly" value="monthly" />
                                                <Picker.Item label="Yearly" value="yearly" />
                                            </Picker>
                                        </View>
                                    </View>
                                </Modal>

                                {(recurrenceType === 'weekly' || recurrenceType === 'custom') && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Repeat On</Text>
                                        <View style={styles.daysGrid}>
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.dayButton,
                                                        recurrenceDays.includes(index) && styles.selectedDay,
                                                    ]}
                                                    onPress={() => {
                                                        const updated = recurrenceDays.includes(index)
                                                            ? recurrenceDays.filter((d) => d !== index)
                                                            : [...recurrenceDays, index].sort((a, b) => a - b);
                                                        setRecurrenceDays(updated);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dayText,
                                                            recurrenceDays.includes(index) && styles.selectedDayText,
                                                        ]}
                                                    >
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {recurrenceType !== 'none' && (
                                    <>
                                        <Text style={styles.label}>Ends</Text>
                                        <TouchableOpacity
                                            style={styles.selectionButton}
                                            onPress={() => setShowRecurrenceEndTypePicker(true)}
                                        >
                                            <Text style={styles.selectionButtonText}>
                                                {recurrenceEndType === 'never' && 'Never'}
                                                {recurrenceEndType === 'date' &&
                                                    `On ${recurrenceEndDate ? recurrenceEndDate.toLocaleDateString() : 'Select Date'}`}
                                                {recurrenceEndType === 'count' &&
                                                    `After ${recurrenceOccurrences || '#'} occurrences`}
                                            </Text>
                                            <Text style={styles.selectionButtonIcon}>⌄</Text>
                                        </TouchableOpacity>
                                        {recurrenceEndType === 'date' && (
                                            <DateTimePicker
                                                value={recurrenceEndDate || new Date()}
                                                mode="date"
                                                display="default"
                                                minimumDate={new Date()}
                                                onChange={(event, date) => {
                                                    if (date) setRecurrenceEndDate(date);
                                                }}
                                            />
                                        )}
                                        {recurrenceEndType === 'count' && (
                                            <TextInput
                                                style={[styles.input, { marginTop: 5 }]}
                                                keyboardType="numeric"
                                                placeholder="Number of times"
                                                value={recurrenceOccurrences ? String(recurrenceOccurrences) : ""}
                                                onChangeText={(t) =>
                                                    setRecurrenceOccurrences(t === "" ? null : Math.max(1, parseInt(t) || 1))
                                                }
                                                placeholderTextColor="#8e8e93"
                                            />
                                        )}
                                    </>
                                )}
                            </View>

                            <Text style={styles.label}>Category</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowCategoryPicker(true)}
                            >
                                <Text style={styles.selectionButtonText}>{editCategory}</Text>
                                <Text style={styles.selectionButtonIcon}>⌄</Text>
                            </TouchableOpacity>
                            <Modal visible={showCategoryPicker} transparent animationType="slide">
                                <View style={[styles.pickerModalOverlay, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
                                    <View style={styles.pickerModalContent}>
                                        <View style={styles.pickerHeader}>
                                            <Text style={styles.pickerTitle}>Select Category</Text>
                                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                                <Text style={styles.pickerDoneButton}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Picker
                                            selectedValue={editCategory}
                                            onValueChange={(itemValue) => setEditCategory(itemValue)}
                                        >
                                            {categories.map((cat) => (
                                                <Picker.Item key={cat} label={cat} value={cat} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            </Modal>

                            <Text style={styles.label}>Date</Text>
                            <Calendar
                                current={editDate}
                                onDayPress={onEditDateSelect}
                                markedDates={{
                                    [editDate]: {
                                        selected: true,
                                        selectedColor: '#007aff',
                                        selectedTextColor: 'white',
                                    },
                                }}
                                theme={styles.calendarTheme}
                            />

                            <Text style={styles.label}>Scheduled Time</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowEditTimePicker(true)}
                            >
                                <Text style={styles.selectionButtonText}>
                                    {editTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                                <Text style={styles.selectionButtonIcon}>⌄</Text>
                            </TouchableOpacity>
                            {showEditTimePicker && (
                                <DateTimePicker
                                    value={editTime}
                                    mode="time"
                                    is24Hour={false}
                                    display="spinner"
                                    onChange={onEditTimeChange}
                                />
                            )}
                            {Platform.OS === 'ios' && showEditTimePicker && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#ccc', marginVertical: 10 }]}
                                    onPress={() => setShowEditTimePicker(false)}
                                >
                                    <Text style={[styles.actionButtonText, { color: '#000' }]}>Confirm Time</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.label}>Duration</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => {
                                    const [hrs, mins] = editDuration.split(':').map(Number);
                                    setTempDurationHours(hrs.toString());
                                    setTempDurationMinutes(mins.toString());
                                    setShowDurationPicker(true);
                                }}
                            >
                                <Text style={styles.selectionButtonText}>{formatDuration(editDuration)}</Text>
                                <Text style={styles.selectionButtonIcon}>⌄</Text>
                            </TouchableOpacity>
                            {renderDurationPicker()}
                            {renderRecurrenceEndTypePicker()}

                            <Text style={styles.label}>Task Reminder</Text>
                            <View style={styles.reminderContainer}>
                                <Text>Enable Reminder</Text>
                                <Switch
                                    value={editReminderEnabled}
                                    onValueChange={setEditReminderEnabled}
                                />
                            </View>
                            {editReminderEnabled && (
                                <View style={styles.reminderOffsetContainer}>
                                    <Text>Remind Before:</Text>
                                    <Picker
                                        selectedValue={editReminderOffset.toString()}
                                        onValueChange={value => setEditReminderOffset(parseInt(value))}
                                    >
                                        <Picker.Item label="15 minutes" value="15" />
                                        <Picker.Item label="30 minutes" value="30" />
                                        <Picker.Item label="1 hour" value="60" />
                                        <Picker.Item label="2 hours" value="120" />
                                    </Picker>
                                </View>
                            )}

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
                                    <Text style={styles.actionButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {renderFeedbackModal()}

            {activeView === 'tasks' ? (
                <AddTaskTab
                    taskInput={taskInput}
                    setTaskInput={setTaskInput}
                    handleAddTask={handleAddTask}
                    tasks={tasks}
                    renderTaskItem={renderTaskItem}
                />
            ) : activeView === 'list' ? (
                <ListViewTab
                    groupTasksByDate={groupTasksByDate}
                    renderTaskItem={renderTaskItem}
                />
            ) : activeView === 'calendar' ? (
                <CalendarViewTab
                    getMarkedDates={getMarkedDates}
                    setSelectedDate={setSelectedDate}
                    selectedDate={selectedDate}
                    tasks={tasks.flatMap((task) => generateRecurringTasks(task))}
                    renderTaskItem={renderTaskItem}
                    getLocalDateKey={getLocalDateKey}
                />
            ) : null}


            <View style={styles.tabBar}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setActiveView('tasks')}
                    >
                        <Animated.View style={[styles.tabIconContainer, activeView === 'tasks' && styles.activeTab]}>
                            <Ionicons
                                name="add"
                                size={24}
                                color={activeView === 'tasks' ? '#007AFF' : '#8E8E93'}
                            />
                        </Animated.View>
                        {activeView === 'tasks' && <Animated.View style={styles.activeIndicator}/>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setActiveView('list')}
                    >
                        <Animated.View style={[styles.tabIconContainer, activeView === 'list' && styles.activeTab]}>
                            <Ionicons
                                name="list-outline"
                                size={24}
                                color={activeView === 'list' ? '#007AFF' : '#8E8E93'}
                            />
                        </Animated.View>
                        {activeView === 'list' && <Animated.View style={styles.activeIndicator}/>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setActiveView('calendar')}
                    >
                        <Animated.View style={[styles.tabIconContainer, activeView === 'calendar' && styles.activeTab]}>
                            <Ionicons
                                name="calendar-outline"
                                size={24}
                                color={activeView === 'calendar' ? '#007AFF' : '#8E8E93'}
                            />
                        </Animated.View>
                        {activeView === 'calendar' && <Animated.View style={styles.activeIndicator}/>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setShowSettingsMenu(!showSettingsMenu)}
                    >
                        <Animated.View style={[styles.tabIconContainer, showSettingsMenu && styles.activeTab]}>
                            <Ionicons
                                name="settings-outline"
                                size={24}
                                color={showSettingsMenu ? '#007AFF' : '#8E8E93'}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export { formatSectionDate, formatTaskDate, formatTaskTime };