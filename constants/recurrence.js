export const generateRecurringTasks = (task) => {
    // If no recurrence or 'none', just return the single occurrence.
    if (!task.recurrence || task.recurrence.type === 'none') return [task];

    const { type, daysOfWeek = [], interval = 1, endType, endDate, occurrences } = task.recurrence;

    // Safety limit so we don't loop infinitely if something is misconfigured
    const MAX_OCCURRENCES = 365;

    const results = [];
    let count = 0;

    // Start from the original date
    let currentDate = new Date(task.date);

    while (true) {
        // Check end conditions
        if (endType === 'count' && count >= occurrences) break;
        if (endType === 'date' && currentDate > new Date(endDate)) break;
        if (count >= MAX_OCCURRENCES) break;

        // We'll handle each recurrence type below
        switch (type) {
            case 'daily':
                // For daily, each day is an occurrence
                const dailyOccurrence = {
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_${count}`,
                    originalTask: task._id
                };
                results.push(dailyOccurrence);
                count++;

                // Move forward by 'interval' days
                currentDate.setUTCDate(currentDate.getUTCDate() + interval);
                break;

            case 'weekly':
                if (daysOfWeek.length === 0) {
                    // If no specific days chosen, treat as normal weekly repetition
                    const weeklyOccurrence = {
                        ...task,
                        date: currentDate.toISOString(),
                        _id: `${task._id}_${count}`,
                        originalTask: task._id
                    };
                    results.push(weeklyOccurrence);
                    count++;

                    // Move forward interval weeks
                    currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                } else {
                    // If daysOfWeek are specified, generate all those days as one "batch"
                    // counting them as a single occurrence
                    const iterationStart = new Date(currentDate);

                    // For each selected day in the week
                    daysOfWeek.sort((a, b) => a - b).forEach((dayIndex) => {
                        // How far from iterationStart's weekday to dayIndex?
                        const iterationStartDay = iterationStart.getUTCDay();
                        let offset = dayIndex - iterationStartDay;
                        if (offset < 0) {
                            offset += 7; // go to next week
                        }
                        const occurrenceDate = new Date(iterationStart);
                        occurrenceDate.setUTCDate(occurrenceDate.getUTCDate() + offset);

                        // Also check if we are past the endDate after applying offset
                        if (endType === 'date' && occurrenceDate > new Date(endDate)) {
                            // do not add it
                            return;
                        }

                        const weeklyOccurrence = {
                            ...task,
                            date: occurrenceDate.toISOString(),
                            _id: `${task._id}_${count}_${dayIndex}`,
                            originalTask: task._id
                        };
                        results.push(weeklyOccurrence);
                    });

                    // After generating the batch for this 1 "week occurrence," increment count
                    count++;

                    // Move iterationStart forward by 'interval' weeks
                    currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                }
                break;

            case 'monthly':
                // Each iteration is 1 month occurrence
                const monthlyOccurrence = {
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_${count}`,
                    originalTask: task._id
                };
                results.push(monthlyOccurrence);
                count++;

                // Move forward 'interval' months
                currentDate.setUTCMonth(currentDate.getUTCMonth() + interval);
                break;

            case 'yearly':
                // Each iteration is 1 year occurrence
                const yearlyOccurrence = {
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_${count}`,
                    originalTask: task._id
                };
                results.push(yearlyOccurrence);
                count++;

                // Move forward 'interval' years
                currentDate.setUTCFullYear(currentDate.getUTCFullYear() + interval);
                break;

            default:
                // If some unknown type, return just the original
                return [task];
        }
    }

    return results;
};
