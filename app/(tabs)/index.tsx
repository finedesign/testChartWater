import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, useColorScheme as RNUseColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from './_layout';
import SimpleChart from '@/components/chart/SimpleChart';
import { processEntriesForChart } from '@/components/chart/chartUtils';

type TimeSpan = 'day' | 'week' | 'twoweeks' | 'month';
type ThemeType = 'light' | 'dark';

// Generate a full 60 days of hourly data, random with occasional skipped days
function generateFullDemoData(): { amountCups: number; fatigue: number; timestamp: Date }[] {
  const totalDays = 60;
  const data: { amountCups: number; fatigue: number; timestamp: Date }[] = [];

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - dayOffset);
    dayDate.setHours(0, 0, 0, 0);

    // 25% chance to skip this day entirely
    if (Math.random() < 0.25) continue;

    // Random number of entries for the day (2-10)
    const entriesCount = Math.floor(Math.random() * 9) + 2;
    for (let i = 0; i < entriesCount; i++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const ts = new Date(dayDate);
      ts.setHours(hour, minute, 0, 0);

      data.push({
        amountCups: +(Math.random() * 2.7 + 0.3).toFixed(1), // 0.3–3.0 cups
        fatigue: Math.floor(Math.random() * 5) + 1, // 1-5
        timestamp: ts,
      });
    }
  }

  // Sort ascending by timestamp to keep order predictable
  data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  console.log(`[DATA] Generated ${data.length} log entries across ~${totalDays} days`);
  return data;
}

function getWindowLength(timespan: TimeSpan) {
  switch (timespan) {
    case 'day': return 1;
    case 'week': return 7;
    case 'twoweeks': return 14;
    case 'month': return 30;
    default: return 7;
  }
}

// Update the timespan button labels
const TIMESPAN_LABELS: Record<TimeSpan, string> = {
  day: 'Day',
  week: 'Week',
  twoweeks: '2 Weeks',
  month: 'Month',
};

export default function HomeScreen() {
  // Get theme from context
  const { theme, toggleTheme } = useAppTheme();
  
  // Generate data once on mount
  const [fullData, setFullData] = useState<Array<{
    amountCups: number;
    fatigue: number;
    timestamp: Date;
  }>>(() => generateFullDemoData());
  
  const [timespan, setTimespan] = useState<TimeSpan>('week');
  const [showWater, setShowWater] = useState(true);
  const [showFatigue, setShowFatigue] = useState(true);
  
  // Track the reference date for our current window
  // (this is the END date of the current window)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now;
  });
  
  // Log the state when it changes
  useEffect(() => {
    console.log(`[NAVIGATION] Current date: ${currentDate.toISOString()}, Timespan: ${timespan}`);
  }, [currentDate, timespan]);
  
  // Compute window dates based on current date and timespan
  const { windowStart, windowEnd } = useMemo(() => {
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);
    
    const start = new Date(end);
    start.setDate(end.getDate() - (getWindowLength(timespan) - 1));
    start.setHours(0, 0, 0, 0);
    
    console.log(`[WINDOW] Start: ${start.toISOString()}, End: ${end.toISOString()}`);
    return { windowStart: start, windowEnd: end };
  }, [currentDate, timespan]);
  
  // Filter data for the current window
  const entries = useMemo(() => {
    const windowData = fullData.filter(e => 
      e.timestamp >= windowStart && e.timestamp <= windowEnd
    );
    console.log(`[ENTRIES] Found ${windowData.length} entries in current window`);
    return windowData;
  }, [fullData, windowStart, windowEnd]);
  
  // DATA BOUNDARIES
  const dataBoundaries = useMemo(() => {
    if (fullData.length === 0) {
      return { earliest: new Date() };
    }

    // Find earliest date
    let earliest = new Date();
    for (const entry of fullData) {
      if (entry.timestamp < earliest) earliest = new Date(entry.timestamp);
    }

    console.log(`[BOUNDARIES] Earliest: ${earliest.toISOString()}`);
    return { earliest };
  }, [fullData]);
  
  // Regenerate all data - completely fresh dataset
  const handleGenerateSampleData = () => {
    console.log('[ACTION] Generating new sample data');
    const newData = generateFullDemoData();
    setFullData(newData);
    
    // Reset to today's view
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    setCurrentDate(now);
  };
  
  // NAVIGATION LOGIC
  
  // Can we go back further?
  const canGoBack = useMemo(() => {
    if (fullData.length === 0) return false;
    
    // The window start would be BEFORE the earliest data
    const nextStart = new Date(windowStart);
    nextStart.setDate(nextStart.getDate() - getWindowLength(timespan));
    
    const canNav = nextStart >= dataBoundaries.earliest;
    console.log(`[NAVIGATION] Can go back: ${canNav}, Next start would be: ${nextStart.toISOString()}`);
    return canNav;
  }, [windowStart, timespan, dataBoundaries.earliest, fullData.length]);
  
  // Can we go forward?
  const canGoForward = useMemo(() => {
    // Don't go past today
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    const canNav = currentDate < now;
    console.log(`[NAVIGATION] Can go forward: ${canNav}, Current end: ${currentDate.toISOString()}, Now: ${now.toISOString()}`);
    return canNav;
  }, [currentDate]);
  
  // Go back one window length
  const handleBack = () => {
    console.log('[ACTION] Going back one window');
    setCurrentDate(prev => {
      // Move back by exactly one window length
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - getWindowLength(timespan));
      
      // Ensure we don't go before the earliest data
      const newWindowStart = new Date(newDate);
      newWindowStart.setDate(newWindowStart.getDate() - (getWindowLength(timespan) - 1));
      newWindowStart.setHours(0, 0, 0, 0);
      
      // If the new window start would be before earliest data, clamp to earliest
      if (newWindowStart < dataBoundaries.earliest) {
        const earliestWindowEnd = new Date(dataBoundaries.earliest);
        earliestWindowEnd.setDate(earliestWindowEnd.getDate() + (getWindowLength(timespan) - 1));
        earliestWindowEnd.setHours(23, 59, 59, 999);
        console.log(`[NAVIGATION] Clamping back navigation to earliest data: ${earliestWindowEnd.toISOString()}`);
        return earliestWindowEnd;
      }
      
      return newDate;
    });
  };
  
  // Go forward one window length
  const handleForward = () => {
    console.log('[ACTION] Going forward one window');
    setCurrentDate(prev => {
      // Move forward by exactly one window length
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + getWindowLength(timespan));
      
      // Don't go past today
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      if (newDate > now) {
        console.log(`[NAVIGATION] Clamping forward navigation to today: ${now.toISOString()}`);
        return now;
      }
      
      return newDate;
    });
  };
  
  // When timespan changes, preserve the latest date in the window
  const handleTimespanChange = (newTimespan: TimeSpan) => {
    console.log(`[ACTION] Changing timespan from ${timespan} to ${newTimespan}`);
    
    // First update the timespan state
    setTimespan(newTimespan);
    
    // Keep the same end date so the most recent data remains visible
    // The start date will be automatically recalculated based on the new timespan
    // No need to adjust currentDate since we want to keep the same end date
  };
  
  // Process chart data
  const chartData = useMemo(() => {
    if (entries.length === 0) {
      // Return demo data if no entries
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        waterData: [1.5, 2.2, 1.8, 0, 2.5, 1.2, 2.0],
        fatigueData: [3, 2, 4, 5, 2, 1, 3]
      };
    }
    return processEntriesForChart(entries, timespan);
  }, [entries, timespan]);
  
  // Create theme-based styles
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5',
    cardColor: theme === 'dark' ? '#242424' : '#ffffff',
    textColor: theme === 'dark' ? '#ffffff' : '#444444',
    primaryColor: '#3b82f6',
    buttonColor: theme === 'dark' ? '#333333' : '#e5e5e5',
    buttonTextColor: theme === 'dark' ? '#ffffff' : '#444444',
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]} 
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <TouchableOpacity 
            onPress={handleBack} 
            disabled={!canGoBack} 
            style={[styles.arrowButton, !canGoBack && styles.arrowDisabled, 
              { backgroundColor: themeStyles.buttonColor }]}
          >
            <Text style={[styles.arrowText, { color: themeStyles.primaryColor }]}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeStyles.primaryColor }]}>WaterLogger</Text>
          <TouchableOpacity 
            onPress={handleForward} 
            disabled={!canGoForward} 
            style={[styles.arrowButton, !canGoForward && styles.arrowDisabled, 
              { backgroundColor: themeStyles.buttonColor }]}
          >
            <Text style={[styles.arrowText, { color: themeStyles.primaryColor }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={toggleTheme}
          style={[styles.themeButton, { backgroundColor: themeStyles.buttonColor }]}
        >
          <MaterialIcons 
            name={theme === 'dark' ? 'dark-mode' : 'light-mode'} 
            size={18} 
            color={themeStyles.textColor} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.dateRow}>
        <Text style={[styles.dateText, { color: themeStyles.textColor }]}>
          {windowStart.toLocaleDateString()} - {windowEnd.toLocaleDateString()}
        </Text>
      </View>
      
      <View style={[styles.chartContainer, { backgroundColor: themeStyles.cardColor }]}>
        <SimpleChart
          theme={theme}
          data={chartData}
          showWater={showWater}
          showFatigue={showFatigue}
        />
      </View>
      
      <View style={styles.buttonRow}>
        {(['day', 'week', 'twoweeks', 'month'] as TimeSpan[]).map(span => (
          <TouchableOpacity
            key={span}
            style={[
              styles.simpleButton, 
              timespan === span && styles.activeButton,
              { backgroundColor: timespan === span ? themeStyles.primaryColor : themeStyles.buttonColor }
            ]}
            onPress={() => handleTimespanChange(span)}
          >
            <Text style={[
              styles.buttonText, 
              { color: timespan === span ? '#ffffff' : themeStyles.buttonTextColor }
            ]}>
              {TIMESPAN_LABELS[span]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.simpleButton, 
            showWater && styles.activeButton,
            { backgroundColor: showWater ? themeStyles.primaryColor : themeStyles.buttonColor }
          ]}
          onPress={() => setShowWater(w => !w)}
        >
          <Text style={[
            styles.buttonText, 
            { color: showWater ? '#ffffff' : themeStyles.buttonTextColor }
          ]}>
            Water
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.simpleButton, 
            showFatigue && styles.activeButton,
            { backgroundColor: showFatigue ? themeStyles.primaryColor : themeStyles.buttonColor }
          ]}
          onPress={() => setShowFatigue(f => !f)}
        >
          <Text style={[
            styles.buttonText, 
            { color: showFatigue ? '#ffffff' : themeStyles.buttonTextColor }
          ]}>
            Fatigue
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.simpleButton, { backgroundColor: themeStyles.buttonColor }]} 
        onPress={handleGenerateSampleData}
      >
        <Text style={[styles.buttonText, { color: themeStyles.buttonTextColor }]}>
          Generate Sample Data
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  dateRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
  },
  arrowButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 0,
    minWidth: 160,
  },
  chartContainer: {
    height: 300,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  simpleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    margin: 4,
    minWidth: 80,
  },
  activeButton: {},
  buttonText: {
    fontWeight: '500',
    textAlign: 'center',
  },
});
