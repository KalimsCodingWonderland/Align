// app/styles.js

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        top: 40,
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f6fa',
    },
    input: {
        height: 50,
        borderColor: '#332e2e',
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
    },
    addTaskButton: {
        backgroundColor: '#007aff',  // A vibrant blue color
        borderRadius: 25,            // Fully rounded corners for a sleek look
        paddingVertical: 15,
        paddingHorizontal: 30,
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 3,
    },
    addTaskButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,            // Adds a little extra spacing for a refined look
    },
    conflictAlert: {
        backgroundColor: '#ffcccc',
        padding: 15,
        borderRadius: 10,
        margin: 10,
    },
    conflictText: {
        color: '#cc0000',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    taskItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    taskText: {
        fontSize: 16,
        marginBottom: 8,
    },
    taskDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4, // Add this line
    },
    timeRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    timeRangeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    categoryLabel: {
        padding: 5,
        borderRadius: 5,
        color: 'white',
        fontWeight: 'bold',
    },
    timeText: {
        color: '#666',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 10,
        padding: 20,
    },
    editModalContent: {
        backgroundColor: 'white',
        margin: 10,
        borderRadius: 10,
        padding: 20,
        maxHeight: '70%',
        width: '95%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    categoryButton: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryText: {
        fontSize: 16,
        textAlign: 'center',
    },
    taskList: {
        marginTop: 20,
    },
    dateText: {
        color: '#666',
        fontWeight: '500',
    },
    deleteButton: {
        marginTop: 1,
        backgroundColor: '#ff3b30',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        position: 'absolute',
        bottom: 40, // moved a bit higher
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        paddingVertical: 30,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 5,
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
        backgroundColor: '#f7f7f7',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 3,
        // Optionally add a subtle transition via Animated (if you're wrapping these in Animated.View)
    },
    activeTab: {
        backgroundColor: '#007aff',
        // Scale up active button slightly (if using Animated you can animate this property)
        transform: [{ scale: 1.1 }],
        // Enhanced shadow on active
        shadowColor: '#007aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 5,
    },
    tabText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 14,
        transition: 'color 0.2s', // Note: For React Native web; on native use Animated.Text instead
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        backgroundColor: '#000',       // black background
        color: '#fff',                 // white text
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 15,
        marginBottom: 3,
        marginHorizontal: 0,          // gives a more refined, inset look
        borderRadius: 8,               // rounded corners
        textAlign: 'center',           // center the text
        // Adding a subtle shadow for depth (works on both iOS and Android)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    calendarContainer: {
        flex: 1,
        marginBottom: 60,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginVertical: 10,
    },
    timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
    },
    pickerColumn: {
        alignItems: 'center',
    },
    pickerLabel: {
        fontSize: 14,
        marginBottom: 5,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        padding: 5,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#666',
    },
    formActions: {
        marginTop: 20,
        gap: 10,
    },
    actionButton: {
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#007aff',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export const getCategoryColor = (category) => {
    const colors = {
        STUDY: '#ff7675',
        ENTERTAINMENT: '#74b9ff',
        WORK: '#55efc4',
        EVENT: '#a29bfe',
        ERRAND: '#ffeaa7',
        EXERCISE: '#fd79a8',
        OTHER: '#464545',
        'HOUSEHOLD CHORE': '#81ecec',
    };
    return colors[category] || '#dfe6e9';
};
