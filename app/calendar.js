// app/calender.js
import { View, Text, TextInput, Button, Alert, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { categorizeTask } from '../constants/api';

const categories = ['STUDY', 'ENTERTAINMENT', 'WORK', 'EVENT', 'ERRAND', 'EXERCISE', 'HOUSEHOLD CHORE'];

export default function CalendarScreen() {
    const router = useRouter();
    const [taskInput, setTaskInput] = useState('');
    const [tasks, setTasks] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);

    const handleAddTask = async () => {
        if (!taskInput.trim()) return;

        const category = await categorizeTask(taskInput.trim());

        if (category === 'MANUAL') {
            setCurrentTask(taskInput);
            setShowCategoryModal(true);
        } else {
            const timeMatch = taskInput.match(/\d+\s*(min|minutes|hour|hours|am|pm)/i);
            const estimatedTime = timeMatch ? timeMatch[0] : '30 min';

            setTasks(prev => [...prev, {
                text: taskInput,
                category,
                time: estimatedTime,
                date: new Date().toLocaleString()
            }]);
            setTaskInput('');
        }
    };

    const handleManualCategory = (category) => {
        const timeMatch = currentTask.match(/\d+\s*(min|minutes|hour|hours|am|pm)/i);
        const estimatedTime = timeMatch ? timeMatch[0] : '30 min';

        setTasks(prev => [...prev, {
            text: currentTask,
            category,
            time: estimatedTime,
            date: new Date().toLocaleString()
        }]);
        setShowCategoryModal(false);
        setCurrentTask(null);
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Enter your task (e.g. 'Need to run for 30min')"
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddTask}
            />

            <Button title="Add Task" onPress={handleAddTask} color="#007aff" />

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

            <FlatList
                data={tasks}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={styles.taskItem}>
                        <Text style={styles.taskText}>{item.text}</Text>
                        <View style={styles.taskDetails}>
                            <Text style={[styles.categoryLabel, { backgroundColor: getCategoryColor(item.category) }]}>
                                {item.category.toLowerCase()}
                            </Text>
                            <Text style={styles.timeText}>⏱ {item.time}</Text>
                        </View>
                    </View>
                )}
                style={styles.taskList}
            />
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
        'HOUSEHOLD CHORE': '#81ecec'
    };
    return colors[category] || '#dfe6e9';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f6fa'
    },
    input: {
        top: 100,
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white'
    },
    taskItem: {
        backgroundColor: 'white',
        top: 60,
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
    }
});
