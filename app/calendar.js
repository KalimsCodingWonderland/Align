// app/calendar.js

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    SectionList,
    ScrollView,
    Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import {
    categorizeTask,
    parseTaskDetails,
    getTasks,
    addTask,
    updateTask,
    deleteTask,
} from '../constants/api';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        let hours = 0, minutes = 0;
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
    const handleEditTask = (index) => {
        const task = tasks[index];
        setEditingTask(index);
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
            // Convert hours to a number and then to string to strip any leading zero.
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
        const taskToEdit = tasks[editingTask];
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
                prevTasks.map((task, index) =>
                    index === editingTask ? result : task
                )
            );
            setEditingTask(null);
        } else {
            Alert.alert('Error', result.error || 'Failed to update task');
        }
    };

    const handleDeleteTask = async () => {
        const taskToDelete = tasks[editingTask];
        const result = await deleteTask(taskToDelete._id, token);
        if (result.success) {
            setTasks((prevTasks) =>
                prevTasks.filter((_, i) => i !== editingTask)
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
        <TouchableOpacity onPress={() => handleEditTask(index)}>
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
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your task (e.g. 'Need to run for 30min on 2025-03-29 at 3:00 PM, 4 hours')"
                            placeholderTextColor="grey"
                            value={taskInput}
                            onChangeText={setTaskInput}
                            onSubmitEditing={handleAddTask}
                        />
                        <Button title="Add Task" onPress={handleAddTask} color="#007aff" />
                        <FlatList
                            data={tasks}
                            keyExtractor={(item) => item._id || Math.random().toString()}
                            renderItem={({ item, index }) =>
                                renderTaskItem({ item, index, showFullDate: true })
                            }
                            style={styles.taskList}
                        />
                    </>
                );
            case 'list':
                return (
                    <SectionList
                        sections={groupTasksByDate()}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        renderItem={({ item, index }) =>
                            renderTaskItem({ item, index, showFullDate: false })
                        }
                        renderSectionHeader={({ section: { title } }) => (
                            <Text style={styles.sectionHeader}>{title}</Text>
                        )}
                    />
                );
            case 'calendar':
                return (
                    <View style={styles.calendarContainer}>
                        <Calendar
                            markedDates={getMarkedDates()}
                            onDayPress={(day) => setSelectedDate(day.dateString)}
                            theme={{
                                todayTextColor: '#007aff',
                                selectedDayBackgroundColor: '#007aff',
                                arrowColor: '#007aff',
                            }}
                        />
                        {selectedDate && (
                            <FlatList
                                contentContainerStyle={{ marginTop: 20 }}
                                data={tasks.filter(
                                    (task) => getLocalDateKey(task.date) === selectedDate
                                )}
                                keyExtractor={(item) => item._id || Math.random().toString()}
                                renderItem={({ item, index }) =>
                                    renderTaskItem({ item, index, showFullDate: false })
                                }
                            />
                        )}
                    </View>
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

const getCategoryColor = (category) => {
    const colors = {
        STUDY: '#ff7675',
        ENTERTAINMENT: '#74b9ff',
        WORK: '#55efc4',
        EVENT: '#a29bfe',
        ERRAND: '#ffeaa7',
        EXERCISE: '#fd79a8',
        OTHER: '#464545',
        'HOUSEHOLD CHORE': '#81ecec',
    };
    return colors[category] || '#dfe6e9';
};

const styles = StyleSheet.create({
    container: {
        top: 40,
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f6fa',
    },
    input: {
        height: 50,
        borderColor: '#332e2e',
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
    },
    taskItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    taskText: {
        fontSize: 16,
        marginBottom: 8,
    },
    taskDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryLabel: {
        padding: 5,
        borderRadius: 5,
        color: 'white',
        fontWeight: 'bold',
    },
    timeText: {
        color: '#666',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 10,
        padding: 20,
    },
    editModalContent: {
        backgroundColor: 'white',
        margin: 10,
        borderRadius: 10,
        padding: 20,
        maxHeight: '70%',
        width: '95%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    categoryButton: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryText: {
        fontSize: 16,
        textAlign: 'center',
    },
    taskList: {
        marginTop: 20,
    },
    dateText: {
        color: '#666',
        fontWeight: '500',
    },
    deleteButton: {
        marginTop: 1,
        backgroundColor: '#ff3b30',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    tabButton: {
        padding: 10,
        borderRadius: 5,
    },
    activeTab: {
        backgroundColor: '#007aff',
    },
    tabText: {
        color: '#333',
        fontWeight: 'bold',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        backgroundColor: '#f0f0f0',
        padding: 12,
        marginTop: 15,
        color: '#333',
    },
    calendarContainer: {
        flex: 1,
        marginBottom: 60,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginVertical: 10,
    },
    timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
    },
    pickerColumn: {
        alignItems: 'center',
    },
    pickerLabel: {
        fontSize: 14,
        marginBottom: 5,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        padding: 5,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#666',
    },
    formActions: {
        marginTop: 20,
        gap: 10,
    },
    actionButton: {
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#007aff',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export { formatSectionDate, formatTaskDate, formatTaskTime };
