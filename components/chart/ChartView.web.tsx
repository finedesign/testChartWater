import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { ChartData, processEntriesForChart } from './chartUtils';
import { WaterLogEntry } from '@/src/lib/logStore';
import Chart from 'chart.js/auto';
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
  onTimespanChange?: (timespan: 'day' | 'week' | 'twoweeks' | 'month') => void;
}

// Add these constants at the top of the component
const containerWidth = 600; // You can adjust this or use window.innerWidth for full width
const containerHeight = 260; // Match your chartContainer style height

// Web-specific Chart.js implementation
const ChartView: React.FC<ChartViewProps> = ({
  entries,
  timespan,
  showWater = true,
  showFatigue = true,
  isLoading = false,
  onTimespanChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart<'bar'> | undefined>(undefined);
  const colorScheme = useColorScheme();
  
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
    theme: colorScheme === 'dark' ? 'dark' : 'light',
  };
  
  // Effect to create or update chart
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Compute colors per theme based on Tailwind
    const bgColor = chartConfig.theme === 'dark' ? tw.colors.gray[900] : '#ffffff';
    const textColor = chartConfig.theme === 'dark' ? '#ffffff' : '#333333';
    const gridColor = chartConfig.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const barColor = chartConfig.theme === 'dark' ? tw.colors.blue[400] : tw.colors.blue[600];
    const lineColor = chartConfig.theme === 'dark' ? tw.colors.yellow[300] : tw.colors.yellow[600];
    
    // Dataset configurations
    const datasets = [];
    
    if (chartConfig.showWater) {
      datasets.push({
        label: 'Water (cups)',
        data: chartData.waterData,
        backgroundColor: barColor,
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      });
    }
    
    if (chartConfig.showFatigue) {
      datasets.push({
        label: 'Fatigue (1-5)',
        data: chartData.fatigueData,
        type: 'line',
        fill: false,
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: lineColor,
        yAxisID: 'y1',
      });
    }
    
    // Configuration for the chart
    const config = {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets
      },
      options: {
        responsive: true,
        animation: false,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Water (cups)',
              color: textColor
            },
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor
            }
          },
          ...(chartConfig.showFatigue ? {
            y1: {
              position: 'right',
              beginAtZero: true,
              min: 0,
              max: 5,
              title: {
                display: true,
                text: 'Fatigue Level',
                color: textColor
              },
              grid: {
                display: false
              },
              ticks: {
                color: textColor,
                stepSize: 1
              }
            }
          } : {}),
          x: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              maxRotation: 45,
              minRotation: 45
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Water Consumption${chartConfig.showFatigue ? ' & Fatigue Level' : ''}`,
            color: textColor,
            font: {
              size: 16
            }
          },
          legend: {
            labels: {
              color: textColor
            }
          }
        }
      }
    };
    
    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    
    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      chartInstanceRef.current = new Chart(ctx, config as any);
    }
    
    // Clean up function to destroy chart on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData, chartConfig]);
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  // Additional HTML controls for web as fallback
  const webControls = (
    <div style={{ 
      position: 'absolute', 
      bottom: 0,
      left: 0,
      right: 0,
      padding: '8px',
      backgroundColor: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      borderRadius: '0 0 8px 8px',
      display: entries.length === 0 ? 'block' : 'none'
    }}>
      <button 
        onClick={() => {
          console.log('Web controls: changing timespan');
          const newTimespan = timespan === 'week' ? 'day' : 'week';
          if (onTimespanChange) {
            onTimespanChange(newTimespan);
          }
        }}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          margin: '0 4px',
          cursor: 'pointer'
        }}
      >
        Toggle Timespan ({timespan})
      </button>
      
      <button 
        onClick={() => console.log('Web controls: generating data')}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          margin: '0 4px',
          cursor: 'pointer'
        }}
      >
        Generate Data (Web)
      </button>
    </div>
  );
  
  // Return the canvas for the chart
  return (
    <View style={[styles.container, {
      backgroundColor: chartConfig.theme === 'dark' ? '#121212' : '#ffffff'
    }]}>
      <MotiView 
        from={{opacity:0,translateY:20}} 
        animate={{opacity:1,translateY:0}} 
        transition={{type:"timing",duration:300}}
        style={styles.canvasContainer}
      >
        <canvas 
          ref={canvasRef} 
          width={containerWidth} 
          height={containerHeight} 
          style={{ width: '100%', height: '100%' }} 
        />
      </MotiView>
      {webControls}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChartView; 