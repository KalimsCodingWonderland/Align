// components/calendar.js

import React from 'react';
import { View, FlatList } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { styles } from '../app/styles';
import {generateRecurringTasks} from "../constants/recurrence";

const CalendarViewTab = ({
                             getMarkedDates,
                             setSelectedDate,
                             selectedDate,
                             tasks,
                             renderTaskItem,
                             getLocalDateKey,
                         }) => {
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
                    contentContainerStyle={{ marginTop: 20, paddingBottom: 60 }}
                    data={tasks
                        .filter((task) => getLocalDateKey(task.date) === selectedDate)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                }
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    renderItem={({ item, index }) =>
                        renderTaskItem({ item, index, showFullDate: false })
                    }
                />
            )}
        </View>
    );
};

export default CalendarViewTab;
