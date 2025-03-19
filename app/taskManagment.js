// app/taskManagment.js

import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

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

// New helper function to normalize duration strings to HH:MM format.
const normalizeDuration = (durationStr) => {
    if (!durationStr) return '00:00';
    if (durationStr.includes(':')) {
        // Assume it's already in HH:MM format; pad if needed.
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
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}`;
    }
};

// Updated formatting function: displays scheduled time in 12-hour format based on UTC values.
const formatTaskTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
};

// Format a time string (HH:MM in 24-hour) into 12-hour format with AM/PM.
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
        return parts.length > 0 ? parts.join(' ') : '0 min';
    }
    return durationStr;
};

const formatSectionDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(Date.UTC(year, month - 1, day));
    const monthName = date.toLocaleDateString(undefined, { month: 'long', timeZone: 'UTC' });
    const weekday = date.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
    const dayInt = parseInt(day, 10);
    const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
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

    useEffect(() => {
        const loadTokenAndTasks = async () => {
            const storedToken = await AsyncStorage.getItem('token');
            if (storedToken) {
                setToken(storedToken);
                const tasksFromApi = await getTasks(storedToken);
                if (Array.isArray(tasksFromApi)) {
                    setTasks(tasksFromApi);
                }
            }
        };
        loadTokenAndTasks();
    }, []);

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
            setCurrentTask({ text: taskInput, date: newTaskDate.toISOString() });
            setShowCategoryModal(true);
        } else {
            const newTask = {
                text: taskInput,
                category,
                time: normalizeDuration(duration),
                date: newTaskDate.toISOString(),
            };
            const result = await addTask(newTask, token);
            if (result._id) {
                setTasks((prev) => [...prev, result]);
                setTaskInput('');
            } else {
                Alert.alert('Error', result.error || 'Failed to add task');
            }
        }
    };

    const handleManualCategory = async (selectedCategory) => {
        const timeMatch = currentTask.text.match(
            /\d+\s*(min|minutes|hour|hours)/i
        );
        const estimatedTime = timeMatch ? normalizeDuration(timeMatch[0]) : '00:30';
        const newTask = {
            text: currentTask.text,
            category: selectedCategory,
            time: estimatedTime,
            date: currentTask.date,
        };
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

    // When editing, convert the task's scheduled and completion times using UTC values.
    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditTaskInput(task.text);
        setEditCategory(task.category);
        const taskDate = new Date(task.date);
        const hour24 = taskDate.getUTCHours();
        const amPm = hour24 >= 12 ? "PM" : "AM";
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        setEditHour(hour12.toString());
        setEditMinute(taskDate.getUTCMinutes().toString().padStart(2, '0'));
        setEditAmPm(amPm);

        // Retrieve the completion time from the DB (either completionTime or time)
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
        const updatedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(editMinute), 0));

        const updatedTask = {
            ...taskToEdit,
            text: editTaskInput,
            date: updatedDate.toISOString(),
            category: editCategory,
            time: `${editCompletionHour.padStart(2, '0')}:${editCompletionMinute.padStart(2, '0')}`,
        };

        const result = await updateTask(taskToEdit._id, updatedTask, token);
        if (result._id) {
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task._id === taskToEdit._id ? result : task
                )
            );
            setEditingTask(null);
        } else {
            Alert.alert('Error', result.error || 'Failed to update task');
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
        const grouped = tasks.reduce((acc, task) => {
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

    const renderTaskItem = ({ item, index, showFullDate }) => (
        <TouchableOpacity onPress={() => handleEditTask(item)}>
            <View style={styles.taskItem}>
                <Text style={styles.taskText}>{item.text}</Text>
                <View style={styles.taskDetails}>
                    <Text style={[styles.categoryLabel, { backgroundColor: getCategoryColor(item.category) }]}>
                        {item.category.toLowerCase()}
                    </Text>
                    <Text style={styles.timeText}>{formatTaskTime(item.date)}</Text>
                    <Text style={styles.timeText}>⏱ {formatDuration(item.completionTime || item.time)}</Text>
                </View>
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

    return (
        <View style={styles.container}>
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
