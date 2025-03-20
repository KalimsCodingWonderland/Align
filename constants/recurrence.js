export const generateRecurringTasks = (task) => {
    if (!task.recurrence || task.recurrence.type === 'none') return [task];

    const occurrences = [];
    let currentDate = new Date(task.date);
    const startDate = new Date(task.date);
    let count = 0;

    while (true) {
        if (task.recurrence.endType === 'count' && count >= task.recurrence.occurrences) break;
        if (task.recurrence.endType === 'date' && currentDate > new Date(task.recurrence.endDate)) break;

        occurrences.push({
            ...task,
            date: currentDate.toISOString(),
            _id: `${task._id}_${count}`,
            originalTask: task._id
        });

        // Increment based on recurrence
        switch (task.recurrence.type) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + task.recurrence.interval);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + (7 * task.recurrence.interval));
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + task.recurrence.interval);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + task.recurrence.interval);
                break;
            case 'custom':
                let nextDate = new Date(currentDate);
                let found = false;
                while (!found) {
                    nextDate.setDate(nextDate.getDate() + 1);
                    if (task.recurrence.daysOfWeek.includes(nextDate.getDay())) {
                        currentDate = new Date(nextDate);
                        found = true;
                    }
                }
                break;
        }
        count++;
    }

    return occurrences;
};