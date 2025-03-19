// components/listView.js

import React from 'react';
import { Text, SectionList } from 'react-native';
import { styles } from '../app/styles';

const ListViewTab = ({ groupTasksByDate, renderTaskItem }) => {
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
                    style={styles.sectionHeader}>{title}
                </Text>
            )}
        />
    );
};

export default ListViewTab;
