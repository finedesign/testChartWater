import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

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

// Native implementation using WebView
export default function SimpleChart({ 
  theme = 'light', 
  data, 
  showWater = true, 
  showFatigue = true 
}: ChartProps) {
  const bgColor = theme === 'dark' ? '#121212' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#333333';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

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

  const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'><script src='https://cdn.jsdelivr.net/npm/chart.js'></script><style>html,body{margin:0;padding:0;background-color:${bgColor};color:${textColor};width:100%;height:100%;}</style></head><body><canvas id='c'></canvas><script>const ctx=document.getElementById('c').getContext('2d');new Chart(ctx,{type:'bar',data:{labels:${JSON.stringify(data.labels)},datasets:${JSON.stringify(datasets)}},options:{responsive:true,animation:false,scales:{y:{beginAtZero:true,grid:{color:'${gridColor}'},ticks:{color:'${textColor}'}},${showFatigue?`y1:{position:'right',beginAtZero:true,min:0,max:5,grid:{display:false},ticks:{color:'${textColor}',stepSize:1}},`:''}x:{grid:{color:'${gridColor}'},ticks:{color:'${textColor}'}}},plugins:{legend:{labels:{color:'${textColor}'}}}}});</script></body></html>`;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
}); 