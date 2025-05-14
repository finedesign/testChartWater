import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Chart from 'chart.js/auto';

interface ChartProps {
  theme: 'light' | 'dark';
  data: {
    labels: string[];
    waterData: number[];
    fatigueData: number[];
  };
  showWater?: boolean;
  showFatigue?: boolean;
}

export default function SimpleChartWeb({
  theme = 'light',
  data,
  showWater = true,
  showFatigue = true,
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // Colors for theme
  const bgColor = theme === 'dark' ? '#121212' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#333333';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart if exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const datasets: any[] = [];
    if (showWater) {
      datasets.push({
        label: 'Water (cups)',
        data: data.waterData,
        backgroundColor: theme === 'dark' ? 'rgba(53, 162, 235, 0.7)' : 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      });
    }
    if (showFatigue) {
      datasets.push({
        label: 'Fatigue (1-5)',
        data: data.fatigueData,
        type: 'line',
        fill: false,
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        yAxisID: 'y1',
      });
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 0,
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor },
          },
          ...(showFatigue && {
            y1: {
              position: 'right',
              beginAtZero: true,
              min: 0,
              max: 5,
              grid: { display: false },
              ticks: { color: textColor, stepSize: 1 },
            },
          }),
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
          },
        },
        plugins: {
          legend: {
            labels: { color: textColor },
          },
        },
      },
    });

    // Ensure correct size after creation
    setTimeout(() => {
      chartRef.current?.resize();
    }, 0);

    return () => {
      chartRef.current?.destroy();
    };
  }, [theme, data, showWater, showFatigue]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* @ts-ignore */}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 