// constants/notifications.js
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getTasks} from "./api";
import {isSameLocalDate} from "../app/paperImport";

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
export async function scheduleDailySummaryNotification(reminderTimeStr) {
    console.log("[LOG] scheduleDailySummaryNotification called with:", reminderTimeStr);

    const [hour, minute] = reminderTimeStr.split(':').map(Number);
    const now = new Date();

    try {
        // Cancel any existing notifications first
        await cancelDailySummaryNotification();

        // Get today's tasks count
        const token = await AsyncStorage.getItem('token');
        const tasks = await getTasks(token);
        const tasksCount = tasks.filter(task =>
            isSameLocalDate(new Date(task.date), now)
        ).length;

        // Determine notification message based on task count
        let bodyMessage;
        if (tasksCount === 0) {
            bodyMessage = "No tasks to do today! Tap to Align.";
        } else if (tasksCount > 10) {
            bodyMessage = `Phew ${tasksCount} tasks! Busy day today, hopefully Align can help!`;
        } else {
            bodyMessage = `You have ${tasksCount} task${tasksCount === 1 ? "" : "s"} scheduled today.`;
        }

        // Calculate notification timing
        const todayNotificationTime = new Date();
        todayNotificationTime.setHours(hour, minute, 0, 0);

        const localDateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');


        // Schedule recurring notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Daily Summary",
                body: "Tap to view today's schedule",
                data: { screen: 'Calendar', date: localDateStr },
            },
            trigger: {
                hour,
                minute,
                seconds: 2,
                repeats: true,
            },
        });

        // Schedule immediate notification if time is in future
        if (todayNotificationTime > now) {
            const delayedTriggerTime = new Date(todayNotificationTime.getTime() + 2000); // Add 2 seconds
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Daily Summary",
                    body: "Tap to view today's schedule",
                    data: { screen: 'Calendar', date: localDateStr },
                },
                trigger: delayedTriggerTime,
            });
        }

        console.log("[LOG] Scheduled notifications with message:", bodyMessage);
        await AsyncStorage.setItem('dailySummaryNotificationId', notificationId);
        return notificationId;

    } catch (error) {
        console.error('[ERROR] Failed to schedule notifications:', error);
        return null;
    }
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
    // If reminders aren't enabled, do nothing.
    if (!task.reminderEnabled) return null;

    // Force a default offset of 15 min if `task.reminderOffset` is missing/0/undefined.
    const offset = (typeof task.reminderOffset === 'number' && task.reminderOffset > 0)
        ? task.reminderOffset
        : 15;

    const taskDate = new Date(task.date);
    // Reminder time = task time minus the offset
    const reminderTime = new Date(taskDate.getTime() - offset * 60 * 1000);
    const now = new Date();

    if (reminderTime <= now) {
        console.log('Reminder time is in the past, not scheduling.');
        return null;
    }

    const content = {
        title: "Task Reminder",
        body: `Reminder: ${task.text} starts at ${taskDate.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        })}`,
        data: { screen: 'TaskDetail', taskId: task._id },
    };

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content,
            trigger: reminderTime, // Using a Date object as trigger.
        });
        console.log('Scheduled reminder with ID:', notificationId);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
}


// Optionally, cancel a scheduled task reminder using its notification ID.
export async function cancelTaskReminder(notificationId) {
    if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
}
