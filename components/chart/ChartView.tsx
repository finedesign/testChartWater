import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useColorScheme } from '@/components/useColorScheme';
import { ChartData, processEntriesForChart } from './chartUtils';
import { createChartHtml } from './createChartHtml';
import { WaterLogEntry } from '@/src/lib/logStore';
import { MotiView } from 'moti';
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config";

// Resolve tailwind config
const tw = resolveConfig(tailwindConfig).theme;

// Chart configuration type
interface ChartConfig {
  timespan: 'day' | 'week' | 'twoweeks' | 'month';
  showWater: boolean;
  showFatigue: boolean;
  theme: 'light' | 'dark';
}

// Props for the chart component
interface ChartViewProps {
  entries: WaterLogEntry[];
  timespan: 'day' | 'week' | 'twoweeks' | 'month';
  showWater?: boolean;
  showFatigue?: boolean;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  onTimespanChange?: (timespan: 'day' | 'week' | 'twoweeks' | 'month') => void;
}

// Chart component
const ChartView: React.FC<ChartViewProps> = ({
  entries,
  timespan,
  showWater = true,
  showFatigue = true,
  isLoading = false,
  theme: explicitTheme,
  onTimespanChange,
}) => {
  const systemColorScheme = useColorScheme();
  // Use effect to force a component rerender when theme changes
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  const colorScheme = explicitTheme || systemColorScheme;
  const actualTheme = colorScheme === 'dark' ? 'dark' : 'light';
  
  // Log theme changes
  useEffect(() => {
    console.log(`[CHART] Theme changed to: ${actualTheme}, explicit=${explicitTheme}, system=${systemColorScheme}`);
    // Force rerender when theme changes
    setForceRenderKey(prev => prev + 1);
  }, [actualTheme, explicitTheme, systemColorScheme]);
  
  // Process entries for chart
  const chartData = useMemo(() => {
    if (entries.length === 0) {
      // Return demo data if no entries
      console.log("Using demo data for chart");
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        waterData: [1.5, 2.2, 1.8, 0, 2.5, 1.2, 2.0],
        fatigueData: [3, 2, 4, 5, 2, 1, 3]
      };
    }
    return processEntriesForChart(entries, timespan);
  }, [entries, timespan]);
  
  // Create chart configuration
  const chartConfig: ChartConfig = {
    timespan,
    showWater,
    showFatigue,
    theme: actualTheme,
  };
  
  // Compute colors per theme
  const bg = actualTheme === "dark" ? tw.colors.gray[900] : "#ffffff";
  const bar = actualTheme === "dark" ? tw.colors.blue[400] : tw.colors.blue[600];
  const line = actualTheme === "dark" ? tw.colors.yellow[300] : tw.colors.yellow[600];
  
  // Create chart HTML - Will recreate when theme changes via forceRenderKey
  const html = useMemo(() => {
    console.log(`[CHART] Creating chart HTML with theme: ${chartConfig.theme}`);
    return createChartHtml(chartData, chartConfig, { bg, bar, line });
  }, [chartData, chartConfig, forceRenderKey, bg, bar, line]);
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  // Return the WebView with the chart
  return (
    <View style={[styles.container, {
      backgroundColor: chartConfig.theme === 'dark' ? '#121212' : '#ffffff'
    }]}>
      <MotiView 
        from={{opacity:0,translateY:20}} 
        animate={{opacity:1,translateY:0}} 
        transition={{type:"timing",duration:300}}
        style={styles.webview}
      >
        <WebView
          key={`chart-webview-${actualTheme}-${forceRenderKey}`}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onError={(e) => console.error('WebView error:', e.nativeEvent)}
          // Important: Set this for WebView to respect dark theme
          contentInsetAdjustmentBehavior="automatic"
          // Force opacity to ensure background shows through
          containerStyle={{ opacity: 0.99 }}
          // Force WebView background to match theme
          cacheEnabled={false}
        />
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChartView; 