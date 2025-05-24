// components/addTask.js
import React from 'react';
import {
    TextInput,
    FlatList,
    TouchableOpacity,
    Text,
    View,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../app/ThemeContext';

const makeStyles = t =>
    StyleSheet.create({
        input: {
            height: 50,
            borderWidth: 1,
            borderColor: t.mode === 'light' ? '#e5e5ea' : '#3a3a3c',
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            color: t.text,
            backgroundColor: t.card,
            marginBottom: 15,
        },
        addBtn: {
            backgroundColor: t.primary,
            borderRadius: 25,
            paddingVertical: 15,
            paddingHorizontal: 20,
            marginVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
            flexDirection: 'row',
        },
        addBtnTxt: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: 1,
        },
        scanBtnTxt: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: 1,
            marginLeft: 8,
        },
        taskList: { marginTop: 20 },
    });

const local = StyleSheet.create({
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    sleepBtn: {
        backgroundColor: '#8e44ad',
    },
});

export default function AddTaskTab({
                                       taskInput,
                                       setTaskInput,
                                       handleAddTask,
                                       tasks,
                                       renderTaskItem,
                                   }) {
    const { theme } = useTheme();
    const s = React.useMemo(() => makeStyles(theme), [theme]);
    const router = useRouter();

    return (
        <>
            <TextInput
                style={s.input}
                placeholder="Enter task (e.g., 'Study Ch. 5 for 1 hour tomorrow at 2 pm')"
                placeholderTextColor={theme.subText}
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddTask}
            />

            <TouchableOpacity style={s.addBtn} onPress={handleAddTask}>
                <Text style={s.addBtnTxt}>ALIGN TASK</Text>
            </TouchableOpacity>

            <View style={local.actionsRow}>
                <TouchableOpacity
                    style={[local.actionBtn, { backgroundColor: '#fd6a6a' }]}
                    onPress={() => router.push('/paperImport')}
                >
                    <MaterialIcons name="scanner" size={20} color="#fff" />
                    <Text style={s.scanBtnTxt}>ALIGN PAPER</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[local.actionBtn, local.sleepBtn]}
                    onPress={() => router.push('/alignSleep')}
                >
                    <MaterialIcons name="bedtime" size={20} color="#fff" />
                    <Text style={s.scanBtnTxt}>ALIGN SLEEP</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tasks}
                keyExtractor={item => item._id || Math.random().toString()}
                renderItem={({ item, index }) =>
                    renderTaskItem({ item, index, showFullDate: true })
                }
                style={s.taskList}
                contentContainerStyle={{ paddingBottom: 150 }}
            />
        </>
    );
}
