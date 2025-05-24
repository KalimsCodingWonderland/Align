// components/listView.js

import React from 'react';
import { Text, SectionList } from 'react-native';
import { useTheme } from '../app/ThemeContext';
import { styles } from '../app/styles';
import { generateRecurringTasks } from '../constants/recurrence';

const ListViewTab = ({ groupTasksByDate, renderTaskItem }) => {
    const { theme } = useTheme();

    return (
        <SectionList
            contentContainerStyle={{ paddingBottom: 120 }}
            sections={groupTasksByDate()}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item, index }) =>
                renderTaskItem({ item, index, showFullDate: false })
            }
            renderSectionHeader={({ section: { title } }) => (
                <Text
                    style={[
                        styles.sectionHeader,
                        theme.mode === 'dark' && { backgroundColor: '#5f2493' }
                    ]}
                >
                    {title}
                </Text>
            )}
        />
    );
};

export default ListViewTab;
