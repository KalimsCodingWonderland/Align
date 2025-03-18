import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, TouchableOpacity, FlatList, SectionList, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { categorizeTask, getTasks, addTask, updateTask, deleteTask } from '../constants/api';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const categories = ['STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT', 'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE', 'OTHER'];

const formatSectionDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' };
    const formattedDate = date.toLocaleDateString(undefined, options);

    const day = date.getDate();
    const ordinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const ordinalDay = `${day}${ordinal(day)}`;
    const month = date.toLocaleDateString(undefined, { month: 'long' });
    const year = date.getFullYear();

    return `${month} ${ordinalDay}, ${year} - ${date.toLocaleDateString(undefined, { weekday: 'long' })}`;
};

const formatTaskDate = (dateString) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return `${month}/${day} - ${weekday}`;
};

const formatTaskTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const timeOptions = [
    '15 min',
    '30 min',
    '45 min',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '3 hours'
];

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
    const [editTime, setEditTime] = useState('');

    // Load token and tasks from API on mount
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

    const handleAddTask = async () => {
        if (!taskInput.trim()) return;

        const category = await categorizeTask(taskInput.trim());
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const newDate = now.toISOString();

        if (category === 'MANUAL') {
            setCurrentTask({ text: taskInput, date: newDate });
            setShowCategoryModal(true);
        } else {
            const timeMatch = taskInput.match(/\d+\s*(min|minutes|hour|hours)/i);
            const estimatedTime = timeMatch ? timeMatch[0] : '30 min';
            const newTask = {
                text: taskInput,
                category,
                time: estimatedTime,
                date: newDate
            };
            const result = await addTask(newTask, token);
            if (result._id) {
                setTasks(prev => [...prev, result]);
                setTaskInput('');
            } else {
                Alert.alert('Error', result.error || 'Failed to add task');
            }
        }
    };

    const handleManualCategory = async (category) => {
        const timeMatch = currentTask.text.match(/\d+\s*(min|minutes|hour|hours)/i);
        const estimatedTime = timeMatch ? timeMatch[0] : '30 min';
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const newDate = now.toISOString();
        const newTask = {
            text: currentTask.text,
            category,
            time: estimatedTime,
            date: newDate
        };
        const result = await addTask(newTask, token);
        if (result._id) {
            setTasks(prev => [...prev, result]);
            setShowCategoryModal(false);
            setCurrentTask(null);
            setTaskInput('');
        } else {
            Alert.alert('Error', result.error || 'Failed to add task');
        }
    };

    const handleEditTask = (index) => {
        const task = tasks[index];
        setEditingTask(index);
        setEditDate(new Date(task.date).toISOString().split('T')[0]);
        setEditTime(task.time);
    };

    const handleDateSelect = (day) => {
        setEditDate(day.dateString);
    };

    const saveEditedTask = async () => {
        const taskToEdit = tasks[editingTask];
        const [year, month, day] = editDate.split('-');
        const date = new Date(year, month - 1, day);
        date.setHours(12, 0, 0, 0);
        const updatedTask = {
            ...taskToEdit,
            date: date.toISOString(),
            time: editTime,
        };
        const result = await updateTask(taskToEdit._id, updatedTask, token);
        if (result._id) {
            setTasks(prevTasks =>
                prevTasks.map((task, index) => (index === editingTask ? result : task))
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
            setTasks(prevTasks => prevTasks.filter((_, i) => i !== editingTask));
            setEditingTask(null);
        } else {
            Alert.alert('Error', result.error || 'Failed to delete task');
        }
    };

    const groupTasksByDate = () => {
        const grouped = tasks.reduce((acc, task) => {
            const dateKey = new Date(task.date).toISOString().split('T')[0];
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
        }, {});

        return Object.entries(grouped)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, items]) => ({
                title: formatSectionDate(date),
                data: items.sort((a, b) => new Date(a.date) - new Date(b.date))
            }));
    };

    const getMarkedDates = () => {
        return tasks.reduce((acc, task) => {
            const date = new Date(task.date).toISOString().split('T')[0];
            acc[date] = { marked: true };
            return acc;
        }, {});
    };

    const renderTaskItem = ({ item, index, showFullDate }) => (
        <TouchableOpacity onPress={() => activeView === 'tasks' ? handleEditTask(index) : null}>
            <View style={styles.taskItem}>
                <Text style={styles.taskText}>{item.text}</Text>
                <View style={styles.taskDetails}>
                    <Text style={[styles.categoryLabel, { backgroundColor: getCategoryColor(item.category) }]}>
                        {item.category.toLowerCase()}
                    </Text>
                    {showFullDate ? (
                        <Text style={styles.dateText}>{formatTaskDate(item.date)}</Text>
                    ) : (
                        <Text style={styles.timeText}>{formatTaskTime(item.date)}</Text>
                    )}
                    <Text style={styles.timeText}>⏱ {item.time}</Text>
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
                            placeholder="Enter your task (e.g. 'Need to run for 30min')"
                            placeholderTextColor="grey"
                            value={taskInput}
                            onChangeText={setTaskInput}
                            onSubmitEditing={handleAddTask}
                        />
                        <Button title="Add Task" onPress={handleAddTask} color="#007aff" />
                        <FlatList
                            data={tasks}
                            keyExtractor={(item) => item._id || Math.random().toString()}
                            renderItem={({ item, index }) => renderTaskItem({ item, index, showFullDate: true })}
                            style={styles.taskList}
                        />
                    </>
                );
            case 'list':
                return (
                    <SectionList
                        sections={groupTasksByDate()}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        renderItem={({ item, index }) => renderTaskItem({ item, index, showFullDate: false })}
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
                                data={tasks.filter(task =>
                                    new Date(task.date).toISOString().split('T')[0] === selectedDate
                                )}
                                keyExtractor={(item) => item._id || Math.random().toString()}
                                renderItem={({ item, index }) => renderTaskItem({ item, index, showFullDate: false })}
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
                        {categories.map(cat => (
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
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Edit Task</Text>

                        <Text style={styles.label}>Select Date</Text>
                        <Calendar
                            current={editDate}
                            onDayPress={handleDateSelect}
                            markedDates={{
                                [editDate]: { selected: true }
                            }}
                            theme={{
                                todayTextColor: '#007aff',
                                selectedDayBackgroundColor: '#007aff',
                                arrowColor: '#007aff',
                            }}
                        />

                        <Text style={styles.label}>Time Allocation</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroller}>
                            {timeOptions.map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={[styles.timeOption, editTime === time && styles.selectedTimeOption]}
                                    onPress={() => setEditTime(time)}
                                >
                                    <Text style={editTime === time ? styles.selectedTimeText : styles.timeText}>{time}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

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
        'HOUSEHOLD CHORE': '#81ecec'
    };
    return colors[category] || '#dfe6e9';
};

const styles = StyleSheet.create({
    container: {
        top: 40,
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f6fa'
    },
    input: {
        height: 50,
        borderColor: '#332e2e',
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white'
    },
    taskItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2
    },
    taskText: {
        fontSize: 16,
        marginBottom: 8
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
        fontWeight: 'bold'
    },
    timeText: {
        color: '#666'
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 10,
        padding: 20
    },
    editModalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 10,
        padding: 20,
        maxHeight: '90%',
        width: '95%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center'
    },
    categoryButton: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    categoryText: {
        fontSize: 16,
        textAlign: 'center'
    },
    taskList: {
        marginTop: 20
    },
    dateText: {
        color: '#666',
        fontWeight: '500',
    },
    deleteButton: {
        marginTop: 20,
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
        borderTopColor: '#ddd'
    },
    tabButton: {
        padding: 10,
        borderRadius: 5
    },
    activeTab: {
        backgroundColor: '#007aff'
    },
    tabText: {
        color: '#333',
        fontWeight: 'bold'
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
        marginBottom: 60
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginVertical: 10
    },
    timeScroller: {
        marginVertical: 10,
        maxHeight: 60,
    },
    timeOption: {
        padding: 10,
        marginRight: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    selectedTimeOption: {
        backgroundColor: '#007aff',
    },
    selectedTimeText: {
        color: 'white',
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
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20
    }
});

export { formatSectionDate, formatTaskDate, formatTaskTime };
