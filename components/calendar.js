import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../app/ThemeContext';
import { styles } from '../app/styles';

const CalendarViewTab = ({
                             getMarkedDates,
                             setSelectedDate,
                             selectedDate,
                             tasks,
                             renderTaskItem,
                             getLocalDateKey,
                         }) => {
    const { theme } = useTheme();
    const isDark     = theme.mode === 'dark';
    const calendarBg = isDark ? '#000' : '#fff';




    return (
        <View style={[styles.calendarContainer, { backgroundColor: calendarBg }]}>
            <Calendar
                /* ▶ 1 */
                key={theme.mode}
                /* ▶ 2 */
                style={{ backgroundColor: calendarBg }}
                markedDates={getMarkedDates()}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                theme={{
                    backgroundColor:       calendarBg,
                    calendarBackground:    calendarBg,
                    textSectionTitleColor: isDark ? '#aaa' : '#999',
                    dayTextColor:          theme.text,
                    todayTextColor:        '#fff',
                    selectedDayBackgroundColor: theme.primary,
                    selectedDayTextColor:  '#fff',
                    arrowColor:            theme.primary,
                    monthTextColor:        theme.text,
                    textDisabledColor:     isDark ? '#555' : '#ccc',
                    dotColor:              theme.primary,
                    todayDotColor:         '#fff',
                }}
                renderHeader={(date) => (
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '600',
                            textAlign: 'center',
                            paddingVertical: 10,
                            color: theme.text,
                        }}>
                        {new Date(date).toLocaleDateString('en-US', {
                            month: 'long',
                            year:  'numeric',
                        })}
                    </Text>
                )}
                dayComponent={({ date, state, marking, onPress }) => {
                    const dateStr    = date.dateString;
                    const isToday    = dateStr === new Date().toISOString().split('T')[0];
                    const isSelected = dateStr === selectedDate;
                    const bg         = isSelected
                        ? theme.primary
                        : isToday ? '#ff453a' : 'transparent';
                    const txtColor   = isSelected || isToday ? '#fff'
                        : state === 'disabled'
                            ? (isDark ? '#555' : '#ccc')
                            : theme.text;

                    return (
                        <TouchableOpacity
                            style={[styles.calendarDayContainer, { backgroundColor: bg }]}
                            onPress={() => onPress(date)}>
                            <Text style={{ color: txtColor, fontWeight: '600' }}>{date.day}</Text>
                            {marking?.marked && (
                                <View
                                    style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: 2.5,
                                        backgroundColor: marking.dotColor || theme.primary,
                                        marginTop: 2,
                                    }}
                                />
                            )}
                        </TouchableOpacity>
                    );
                }}
            />

            <FlatList
                contentContainerStyle={{ marginTop: 20, paddingBottom: 60 }}
                data={tasks
                    .filter((t) => getLocalDateKey(t.date) === selectedDate)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))}
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item, index }) => renderTaskItem({ item, index })}
            />
        </View>
    );
};

export default CalendarViewTab;
