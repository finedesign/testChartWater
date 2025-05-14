import { Timestamp } from 'firebase/firestore';

// Interface for chart data
export interface ChartData {
  labels: string[];
  waterData: number[];
  fatigueData: number[];
}

// Update WaterLogEntry type to make userId optional
export interface WaterLogEntry {
  id?: string;
  userId?: string;  // Make userId optional
  amountCups: number;
  fatigue: number; // 1-5 scale
  timestamp: Date | { toDate: () => Date };
}

// Function to group entries by hour (for day view)
export const groupEntriesByHour = (entries: WaterLogEntry[]): ChartData => {
  // Create 24 hour buckets
  const hourBuckets: { waterTotal: number; fatigueCount: number; fatigueSum: number }[] = 
    Array(24).fill(null).map(() => ({
      waterTotal: 0,
      fatigueCount: 0,
      fatigueSum: 0
    }));

  // Group entries by hour
  for (const entry of entries) {
    const date = entry.timestamp instanceof Date ? entry.timestamp : entry.timestamp.toDate();
    const hour = date.getHours();
    hourBuckets[hour].waterTotal += entry.amountCups;
    hourBuckets[hour].fatigueSum += entry.fatigue;
    hourBuckets[hour].fatigueCount += 1;
  }

  // Create labels for hours
  const labels = Array(24).fill(null).map((_, i) => {
    const hour = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return `${hour}${ampm}`;
  });

  // Calculate average fatigue per hour
  const waterData = hourBuckets.map(bucket => bucket.waterTotal);
  const fatigueData = hourBuckets.map(bucket => 
    bucket.fatigueCount ? bucket.fatigueSum / bucket.fatigueCount : 0
  );

  return { labels, waterData, fatigueData };
};

// Function to group entries by day within a specified window length
export const groupEntriesByDay = (
  entries: WaterLogEntry[],
  days: number
): ChartData => {
  if (days <= 0) days = 1;

  // Determine window end date based on latest date in entries to preserve alignment with recent date
  let windowEnd: Date;
  if (entries.length > 0) {
    const latestEntry = entries.reduce((prev, curr) => {
      const prevDate = prev.timestamp instanceof Date ? prev.timestamp : prev.timestamp.toDate();
      const currDate = curr.timestamp instanceof Date ? curr.timestamp : curr.timestamp.toDate();
      return prevDate >= currDate ? prev : curr;
    });
    windowEnd = latestEntry.timestamp instanceof Date ? latestEntry.timestamp : latestEntry.timestamp.toDate();
    windowEnd = new Date(windowEnd);
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    windowEnd = new Date();
    windowEnd.setHours(23, 59, 59, 999);
  }

  // Calculate window start from window end
  const windowStart = (() => {
    const start = new Date(windowEnd);
    start.setHours(0, 0, 0, 0);
    start.setDate(windowEnd.getDate() - (days - 1));
    return start;
  })();

  // Create buckets for each day in the window
  const dayBuckets: {
    waterTotal: number;
    fatigueCount: number;
    fatigueSum: number;
    date: Date;
  }[] = Array(days)
    .fill(null)
    .map((_, i) => {
      const date = new Date(windowStart);
      date.setDate(windowStart.getDate() + i);
      return {
        waterTotal: 0,
        fatigueCount: 0,
        fatigueSum: 0,
        date,
      };
    });

  // Aggregate entries into buckets
  for (const entry of entries) {
    const entryDate = entry.timestamp instanceof Date ? entry.timestamp : entry.timestamp.toDate();
    const bucketIndex = Math.floor((entryDate.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000));
    if (bucketIndex >= 0 && bucketIndex < dayBuckets.length) {
      const bucket = dayBuckets[bucketIndex];
      bucket.waterTotal += entry.amountCups;
      bucket.fatigueSum += entry.fatigue;
      bucket.fatigueCount += 1;
    }
  }

  // Labels and data arrays
  const labels = dayBuckets.map((bucket) => {
    const d = bucket.date;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const waterData = dayBuckets.map((b) => b.waterTotal);
  const fatigueData = dayBuckets.map((b) => (b.fatigueCount ? b.fatigueSum / b.fatigueCount : 0));

  return { labels, waterData, fatigueData };
};

// Convert log entries to chart data based on timespan
export const processEntriesForChart = (
  entries: WaterLogEntry[], 
  timespan: 'day' | 'week' | 'twoweeks' | 'month'
): ChartData => {
  switch (timespan) {
    case 'day':
      // Group entries for whichever day is represented in the provided entries array
      return groupEntriesByHour(entries);
    
    case 'week':
      return groupEntriesByDay(entries, 7);
    
    case 'twoweeks':
      return groupEntriesByDay(entries, 14);
    
    case 'month':
      return groupEntriesByDay(entries, 30);
    
    default:
      return groupEntriesByDay(entries, 7);
  }
}; 