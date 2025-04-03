// components/addTask.js
import React from 'react';
import { TextInput, FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native'; // Import StyleSheet
import { styles } from '../app/styles';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
// Removed generateRecurringTasks import as it's not used here

const AddTaskTab = ({
                        taskInput,
                        setTaskInput,
                        handleAddTask,
                        tasks,
                        renderTaskItem,
                        hasConflict // Removed, conflict check handled before calling handleAddTask now
                    }) => {

    const router = useRouter();

    return (
        <>
            <TextInput
                style={styles.input}
                placeholder="Enter task (e.g., 'Study Ch. 5 for 1 hour tomorrow at 2pm')" // Simplified placeholder
                placeholderTextColor="grey"
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddTask} // Allow submitting via keyboard
            />

            {/* Removed conflict alert view, handled by modal now */}

            <TouchableOpacity
                style={styles.addTaskButton} // Keep original style
                onPress={handleAddTask}
            >
                <Text style={styles.addTaskButtonText}>ALIGN TASK</Text>
            </TouchableOpacity>

            {/* Container for action buttons */}
            <View style={localStyles.actionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.scanButton, localStyles.actionButton]} // Use existing base style + specific flex
                    onPress={() => router.push('/paperImport')}
                >
                    <MaterialIcons name="scanner" size={20} color="white" />
                    <Text style={styles.scanButtonText}>ALIGN PAPER</Text>
                </TouchableOpacity>

                {/* --- NEW ALIGN SLEEP BUTTON --- */}
                <TouchableOpacity
                    style={[styles.scanButton, localStyles.actionButton, localStyles.sleepButton]} // New style for sleep button
                    onPress={() => router.push('/alignSleep')} // Navigate to the new screen
                >
                    <MaterialIcons name="bedtime" size={20} color="white" />
                    <Text style={styles.scanButtonText}>ALIGN SLEEP</Text>
                </TouchableOpacity>
                {/* --- END NEW BUTTON --- */}
            </View>

            <FlatList
                data={tasks} // Use the raw tasks list
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item, index }) =>
                    renderTaskItem({ item, index, showFullDate: true }) // showFullDate might not be needed depending on renderTaskItem logic
                }
                style={styles.taskList}
                contentContainerStyle={{ paddingBottom: 150 }} // Increased padding for tab bar
            />
        </>
    );
};

// Local styles for AddTaskTab specific layout
const localStyles = StyleSheet.create({
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10, // Add gap between buttons
    },
    actionButton: {
        flex: 1, // Make buttons share space equally
        marginVertical: 0, // Remove vertical margin inherited from scanButton if needed
    },
    sleepButton: {
        backgroundColor: '#8e44ad', // Example: Purple color for Sleep button
    },
});


export default AddTaskTab;