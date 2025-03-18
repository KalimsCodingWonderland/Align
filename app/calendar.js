// app/calendar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, TouchableOpacity, FlatList, SectionList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { categorizeTask, createTask, getTasks, updateTask, deleteTask } from '../constants/api';
import { Calendar } from 'react-native-calendars';

const categories = ['STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT', 'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE', 'OTHER'];
const timeOptions = ['15 min', '30 min', '45 min', '1 hour', '1.5 hours', '2 hours', '3 hours'];

const CalendarScreen = () => {
    const router = useRouter();
    const [token, setToken] = useState('YOUR_USER_TOKEN_HERE'); // Replace with real token from login
    const [taskInput, setTaskInput] = useState('');
    const [tasks, setTasks] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [activeView, setActiveView] = useState('tasks');
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');

    // Fetch tasks from backend when token changes (i.e. when user logs in)
    useEffect(() => {
        if (token) {
            loadTasks();
        }
    }, [token]);

    const loadTasks = async () => {
        const result = await getTasks(token);
        if (!result.error) {
            setTasks(result.tasks);
        }
    };

    const handleAddTask = async () => {
        if (!taskInput.trim()) return;

        const category = await categorizeTask(taskInput.trim());
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const newDate = now.toISOString();
        const timeMatch = taskInput.match(/\d+\s*(min|minutes|hour|hours)/i);
        const estimatedTime = timeMatch ? timeMatch[0] : '30 min';

        // If manual, prompt for category selection
        if (category === 'MANUAL') {
            setCurrentTask({ text: taskInput, date: newDate, time: estimatedTime });
            setShowCategoryModal(true);
        } else {
            const newTask = { text: taskInput, category, time: estimatedTime, date: newDate };
            const result = await createTask(token, newTask);
            if (!result.error) {
                setTasks(prev => [...prev, result.task]);
                setTaskInput('');
            }
        }
    };

    const handleManualCategory = async (selectedCategory) => {
        const newTask = {
            text: currentTask.text,
            category: selectedCategory,
            time: currentTask.time,
            date: currentTask.date
        };
        const result = await createTask(token, newTask);
        if (!result.error) {
            setTasks(prev => [...prev, result.task]);
        }
        setShowCategoryModal(false);
        setCurrentTask(null);
        setTaskInput('');
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditDate(new Date(task.date).toISOString().split('T')[0]);
        setEditTime(task.time);
    };

    const saveEditedTask = async () => {
        if (!editingTask) return;
        const [year, month, day] = editDate.split('-');
        const date = new Date(year, month - 1, day);
        date.setHours(12, 0, 0, 0);

        const updatedData = {
            text: editingTask.text,
            category: editingTask.category,
            time: editTime,
            date: date.toISOString()
        };

        const result = await updateTask(token, editingTask._id, updatedData);
        if (!result.error) {
            // Update local tasks list
            setTasks(prev =>
                prev.map(task => (task._id === editingTask._id ? result.task : task))
            );
        }
        setEditingTask(null);
    };

    const handleDeleteTask = async () => {
        if (!editingTask) return;
        const result = await deleteTask(token, editingTask._id);
        if (!result.error) {
            setTasks(prev => prev.filter(task => task._id !== editingTask._id));
        }
        setEditingTask(null);
    };

    const formatSectionDate = (dateString) => {
        const date = new Date(dateString);
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
        const day = date.getDate();
        const ordinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return s[(v - 20) % 10] || s[v] || s[0];
        };
        return `${date.toLocaleDateString(undefined, options).replace(/\d+/, `${day}${ordinal(day)}`)} - ${weekday}`;
    };

    const formatTaskDate = (dateString) => {
        const date = new Date(dateString);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2).toUpperCase();
        return `${month}/${day} - ${weekday}`;
    };

    const formatTaskTime = (dateString) => {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
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

    const renderTimeScroller = () => (
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
    );

    const renderTaskItem = ({ item }) => (
        <TouchableOpacity onPress={() => activeView === 'tasks' ? handleEditTask(item) : null}>
            <View style={styles.taskItem}>
                <Text style={styles.taskText}>{item.text}</Text>
                <View style={styles.taskDetails}>
                    <Text style={[styles.categoryLabel, { backgroundColor: getCategoryColor(item.category) }]}>
                        {item.category.toLowerCase()}
                    </Text>
                    {activeView === 'tasks' ? (
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
                            renderItem={renderTaskItem}
                            style={styles.taskList}
                        />
                    </>
                );
            case 'list':
                return (
                    <SectionList
                        sections={groupTasksByDate()}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => renderTaskItem({ item })}
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
                                arrowColor: '#007aff'
                            }}
                        />
                        {selectedDate && (
                            <FlatList
                                data={tasks.filter(task =>
                                    new Date(task.date).toISOString().split('T')[0] === selectedDate
                                )}
                                keyExtractor={(item) => item._id || Math.random().toString()}
                                renderItem={({ item }) => renderTaskItem({ item })}
                            />
                        )}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Modal for manual category selection */}
            <Modal visible={showCategoryModal} transparent>
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

            {/* Modal for editing tasks */}
            <Modal visible={!!editingTask} transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.editModalContent}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setEditingTask(null)}>
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Task</Text>
                        <Text style={styles.label}>Select Date</Text>
                        <Calendar
                            current={editDate}
                            onDayPress={(day) => setEditDate(day.dateString)}
                            markedDates={{ [editDate]: { selected: true } }}
                            theme={{
                                todayTextColor: '#007aff',
                                selectedDayBackgroundColor: '#007aff',
                                arrowColor: '#007aff'
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
                                    <Text style={editTime === time ? styles.selectedTimeText : styles.timeText}>
                                        {time}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.formActions}>
                            <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={saveEditedTask}>
                                <Text style={styles.actionButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteTask}>
                                <Text style={styles.actionButtonText}>Delete Task</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {renderTasks()}

            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tabButton, activeView === 'tasks' && styles.activeTab]} onPress={() => setActiveView('tasks')}>
                    <Text style={styles.tabText}>Add Task</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, activeView === 'list' && styles.activeTab]} onPress={() => setActiveView('list')}>
                    <Text style={styles.tabText}>List View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, activeView === 'calendar' && styles.activeTab]} onPress={() => setActiveView('calendar')}>
                    <Text style={styles.tabText}>Calendar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const getCategoryColor = (category) => {
    const colors = {
        STUDY: '#ff7675',
        ENTERTAINMENT: '#74b9ff',
        WORK: '#55efc4',
        EVENT: '#a29bfe',
        ERRAND: '#ffeaa7',
        EXERCISE: '#fd79a8',
        'HOUSEHOLD CHORE': '#81ecec',
        OTHER: '#464545'
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
        alignItems: 'center'
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
        width: '95%'
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
        fontWeight: '500'
    },
    deleteButton: {
        marginTop: 20,
        backgroundColor: '#ff3b30',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center'
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold'
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
        color: '#333'
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
        maxHeight: 60
    },
    timeOption: {
        padding: 10,
        marginRight: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0'
    },
    selectedTimeOption: {
        backgroundColor: '#007aff'
    },
    selectedTimeText: {
        color: 'white'
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        padding: 5
    },
    closeButtonText: {
        fontSize: 24,
        color: '#666'
    },
    formActions: {
        marginTop: 20,
        gap: 10
    },
    actionButton: {
        borderRadius: 8,
        padding: 15,
        alignItems: 'center'
    },
    saveButton: {
        backgroundColor: '#007aff'
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default CalendarScreen;
