// components/calendar.js
import React from 'react';
import {View, Text, FlatList, TouchableOpacity} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { styles } from '../app/styles';
import { generateRecurringTasks } from "../constants/recurrence";


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
                    todayTextColor: '#ff0000',
                    selectedDayBackgroundColor: 'transparent',
                    selectedDayTextColor: '#fff400',
                    arrowColor: '#007aff',
                    dotColor: '#9f00ff',
                    todayDotColor: '#00ceff',
                }}
                renderHeader={(date) => {
                    const formatted = new Date(date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                    });
                    return (
                        <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', paddingVertical: 10 }}>
                            {formatted}
                        </Text>
                    );
                }}
                dayComponent={({ date, state, marking, onPress }) => {
                    const dateStr = date.dateString;
                    const isToday = dateStr === new Date().toLocaleDateString('en-CA');
                    const isSelected = dateStr === selectedDate;

                    let backgroundColor = 'transparent';
                    let textColor = '#2d4150';

                    if (isToday) {
                        backgroundColor = '#ff3b30'; // red
                        textColor = '#fff';
                    }

                    if (isSelected) {
                        backgroundColor = '#007aff'; // blue
                        textColor = '#fff';
                    }

                    return (
                        <TouchableOpacity
                            style={[
                                styles.calendarDayContainer,
                                {
                                    backgroundColor,
                                },
                            ]}
                            onPress={() => onPress(date)}
                        >
                            <Text style={{
                                color: state === 'disabled' ? '#c8c8c8' : textColor,
                                fontWeight: '600',
                            }}>
                                {date.day}
                            </Text>
                            {marking?.marked && (
                                <View style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: marking.dotColor || '#007aff',
                                    marginTop: 2,
                                }} />
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
            {(
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
