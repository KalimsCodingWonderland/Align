// components/addTask.js
import React from 'react';
import { TextInput, FlatList, TouchableOpacity, Text, View } from 'react-native';
import { styles } from '../app/styles';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const AddTaskTab = ({
                        taskInput,
                        setTaskInput,
                        handleAddTask,
                        tasks,
                        renderTaskItem,
                        hasConflict
                    }) => {

    const router = useRouter();

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

            {hasConflict && (
                <View style={styles.conflictAlert}>
                    <Text style={styles.conflictText}>
                        ⚠️ Time conflict detected! Tap ALIGN to schedule anyway
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.addTaskButton,
                    hasConflict && { backgroundColor: '#ff4444' }
                ]}
                onPress={handleAddTask}
            >
                <Text style={styles.addTaskButtonText}>
                    {hasConflict ? 'ALIGN ANYWAY' : 'ALIGN'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.scanButton}
                onPress={() => router.push('/paperImport')}
            >
                <MaterialIcons name="scanner" size={20} color="white" />
                <Text style={styles.scanButtonText}>ALIGN PAPER</Text>
            </TouchableOpacity>

            <FlatList
                data={tasks}
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item, index }) =>
                    renderTaskItem({ item, index, showFullDate: true })
                }
                style={styles.taskList}
                contentContainerStyle={{ paddingBottom: 120 }}
            />
        </>
    );
};

export default AddTaskTab;