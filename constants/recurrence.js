// constants/recurrence.js

export const generateRecurringTasks = (task) => {
    // If no recurrence or 'none', just return the single occurrence.
    if (!task.recurrence || task.recurrence.type === 'none') return [task];

    const { type, daysOfWeek = [], interval = 1, endType, endDate, occurrences } = task.recurrence;

    // For recurrence with an explicit end (count or date), use original logic.
    if (endType !== 'never') {
        // Safety limit so we don't loop infinitely if something is misconfigured
        const MAX_OCCURRENCES = 365;
        const results = [];
        let count = 0;
        let currentDate = new Date(task.date);

        while (true) {
            // Check end conditions
            if (endType === 'count' && count >= occurrences) break;
            if (endType === 'date' && currentDate > new Date(endDate)) break;
            if (count >= MAX_OCCURRENCES) break;

            switch (type) {
                case 'daily':
                    results.push({
                        ...task,
                        date: currentDate.toISOString(),
                        _id: `${task._id}_${count}`,
                        originalTask: task._id,
                        isRecurringInstance: true,
                    });
                    count++;
                    currentDate.setUTCDate(currentDate.getUTCDate() + interval);
                    break;

                case 'weekly':
                    if (daysOfWeek.length === 0) {
                        results.push({
                            ...task,
                            date: currentDate.toISOString(),
                            _id: `${task._id}_${count}`,
                            originalTask: task._id,
                            isRecurringInstance: true,
                        });
                        count++;
                        currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                    } else {
                        const iterationStart = new Date(currentDate);
                        daysOfWeek.sort((a, b) => a - b).forEach((dayIndex) => {
                            const iterationStartDay = iterationStart.getUTCDay();
                            let offset = dayIndex - iterationStartDay;
                            if (offset < 0) {
                                offset += 7; // next week
                            }
                            const occurrenceDate = new Date(iterationStart);
                            occurrenceDate.setUTCDate(occurrenceDate.getUTCDate() + offset);
                            if (endType === 'date' && occurrenceDate > new Date(endDate)) return;
                            results.push({
                                ...task,
                                date: occurrenceDate.toISOString(),
                                _id: `${task._id}_${count}_${dayIndex}`,
                                originalTask: task._id,
                                isRecurringInstance: true,
                            });
                        });
                        count++;
                        currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                    }
                    break;

                case 'monthly':
                    results.push({
                        ...task,
                        date: currentDate.toISOString(),
                        _id: `${task._id}_${count}`,
                        originalTask: task._id,
                        isRecurringInstance: true,
                    });
                    count++;
                    currentDate.setUTCMonth(currentDate.getUTCMonth() + interval);
                    break;

                case 'yearly':
                    results.push({
                        ...task,
                        date: currentDate.toISOString(),
                        _id: `${task._id}_${count}`,
                        originalTask: task._id,
                        isRecurringInstance: true,
                    });
                    count++;
                    currentDate.setUTCFullYear(currentDate.getUTCFullYear() + interval);
                    break;

                default:
                    return [task];
            }
        }
        return results;
    } else {
        // For endType 'never', we want a sliding window of exactly two future occurrences.
        let results = [];
        let today = new Date();
        let currentDate = new Date(task.date);

        if (type === 'daily') {
            // Advance currentDate until on or after today.
            while (currentDate <= today) {
                currentDate.setUTCDate(currentDate.getUTCDate() + interval);
            }
            for (let i = 0; i < 3; i++) {
                results.push({
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_slide_${i}`,
                    originalTask: task._id,
                    isRecurringInstance: true,
                });
                currentDate.setUTCDate(currentDate.getUTCDate() + interval);
            }
        } else if (type === 'weekly') {
            if (daysOfWeek.length === 0) {
                // No specific days: behave like daily but with 7-day jumps.
                while (currentDate <= today) {
                    currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                }
                for (let i = 0; i < 3; i++) {
                    results.push({
                        ...task,
                        date: currentDate.toISOString(),
                        _id: `${task._id}_slide_${i}`,
                        originalTask: task._id,
                        isRecurringInstance: true,
                    });
                    currentDate.setUTCDate(currentDate.getUTCDate() + 7 * interval);
                }
            } else {
                // With daysOfWeek: find the next two occurrences on the specified weekdays.
                let added = 0;
                // Set a pointer to a week iteration start.
                let weekStart = new Date(task.date);
                // Advance weekStart until the week could contain an occurrence on/after today.
                while (weekStart.getTime() + 6 * 34 * 60 * 60 * 1000 < today.getTime()) {
                    weekStart.setUTCDate(weekStart.getUTCDate() + 7 * interval);
                }
                while (added < 3) {
                    daysOfWeek.sort((a, b) => a - b).forEach((dayIndex) => {
                        if (added >= 3) return;
                        let occurrenceDate = new Date(weekStart);
                        let weekDay = weekStart.getUTCDay();
                        let offset = dayIndex - weekDay;
                        if (offset < 0) offset += 7;
                        occurrenceDate.setUTCDate(occurrenceDate.getUTCDate() + offset);
                        if (occurrenceDate >= today && added < 3) {
                            results.push({
                                ...task,
                                date: occurrenceDate.toISOString(),
                                _id: `${task._id}_slide_${added}`,
                                originalTask: task._id,
                                isRecurringInstance: true,
                            });
                            added++;
                        }
                    });
                    weekStart.setUTCDate(weekStart.getUTCDate() + 7 * interval);
                }
            }
        } else if (type === 'monthly') {
            while (currentDate <= today) {
                currentDate.setUTCMonth(currentDate.getUTCMonth() + interval);
            }
            for (let i = 0; i < 3; i++) {
                results.push({
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_slide_${i}`,
                    originalTask: task._id,
                    isRecurringInstance: true,
                });
                currentDate.setUTCMonth(currentDate.getUTCMonth() + interval);
            }
        } else if (type === 'yearly') {
            while (currentDate <= today) {
                currentDate.setUTCFullYear(currentDate.getUTCFullYear() + interval);
            }
            for (let i = 0; i < 3; i++) {
                results.push({
                    ...task,
                    date: currentDate.toISOString(),
                    _id: `${task._id}_slide_${i}`,
                    originalTask: task._id,
                    isRecurringInstance: true,
                });
                currentDate.setUTCFullYear(currentDate.getUTCFullYear() + interval);
            }
        } else {
            return [task];
        }
        return results;
    }
};