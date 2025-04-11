// constants/notifications.js
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Call this at app launch to ask for notification permissions.
export async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        alert('Failed to get push token for notifications!');
        return;
    }
}

// Schedules (or reschedules) the daily summary notification.
// reminderTime is a string "HH:mm" (24-hour).
// tasksCount is used to generate the notification content.
export async function scheduleDailySummaryNotification(reminderTime, tasksCount) {
    let [hour, minute] = reminderTime.split(':').map(Number);
    const now = new Date();
    let scheduledDate = new Date(now);
    scheduledDate.setHours(hour, minute, 0, 0);
    if (scheduledDate <= now) {
        // If the time has passed today, schedule for tomorrow.
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    const content = {
        title: "Daily Summary",
        body: `You have ${tasksCount} task${tasksCount === 1 ? "" : "s"} scheduled for today.`,
        data: { screen: 'Calendar', date: new Date().toISOString().split('T')[0] },
    };
    // Set the trigger to fire daily at the specified hour/minute.
    const trigger = {
        hour,
        minute,
        repeats: true,
    };
    const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
    });
    await AsyncStorage.setItem('dailySummaryNotificationId', notificationId);
    return notificationId;
}

export async function cancelDailySummaryNotification() {
    const notificationId = await AsyncStorage.getItem('dailySummaryNotificationId');
    if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await AsyncStorage.removeItem('dailySummaryNotificationId');
    }
}

// Schedules a task reminder notification if enabled.
// The task object should include:
//    text, date (ISO string), reminderEnabled (boolean) and reminderOffset (in minutes)
export async function scheduleTaskReminder(task) {
    if (!task.reminderEnabled) return null;
    const taskDate = new Date(task.date);
    const reminderTime = new Date(taskDate.getTime() - task.reminderOffset * 60 * 1000);
    const now = new Date();
    if (reminderTime <= now) return null; // Do not schedule if reminder time is in the past
    const content = {
        title: "Task Reminder",
        body: `Reminder: ${task.text} starts at ${taskDate.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        })}`,
        data: { screen: 'TaskDetail', taskId: task._id },
    };
    const trigger = reminderTime; // Use an absolute trigger date
    const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
    });
    return notificationId;
}

// Optionally, cancel a scheduled task reminder using its notification ID.
export async function cancelTaskReminder(notificationId) {
    if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
}
