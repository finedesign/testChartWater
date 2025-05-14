// Create a dedicated file for chart HTML generation
export const createChartHtml = (chartData, config, customColors = {}) => {
  const theme = config.theme || 'light';
  
  // Set theme-specific colors, allow override from customColors
  const bgColor = customColors.bg || (theme === 'dark' ? '#121212' : '#ffffff');
  const textColor = theme === 'dark' ? '#ffffff' : '#333333';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Dataset configurations with theme-specific colors
  const waterDataset = {
    label: 'Water (cups)',
    data: chartData.waterData,
    backgroundColor: customColors.bar || (theme === 'dark' ? 'rgba(53, 162, 235, 0.7)' : 'rgba(53, 162, 235, 0.5)'),
    borderColor: 'rgba(53, 162, 235, 1)',
    borderWidth: 1,
    yAxisID: 'y',
  };
  
  const fatigueDataset = {
    label: 'Fatigue (1-5)',
    data: chartData.fatigueData,
    type: 'line',
    fill: false,
    borderColor: customColors.line || 'rgba(255, 99, 132, 1)',
    borderWidth: 2,
    pointRadius: 3,
    pointBackgroundColor: customColors.line || 'rgba(255, 99, 132, 1)',
    yAxisID: 'y1',
  };
  
  // Only include datasets that should be shown
  const datasets = [];
  if (config.showWater) datasets.push(waterDataset);
  if (config.showFatigue) datasets.push(fatigueDataset);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          background-color: ${bgColor} !important;
          color: ${textColor} !important;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
        }
        #chartContainer {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        canvas {
          max-width: 100%;
          max-height: 100%;
        }
      </style>
    </head>
    <body>
      <div id="chartContainer">
        <canvas id="waterChart"></canvas>
      </div>
      
      <script>
        // Using the theme: ${theme}
        const ctx = document.getElementById('waterChart').getContext('2d');
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(chartData.labels)},
            datasets: ${JSON.stringify(datasets)}
          },
          options: {
            responsive: true,
            animation: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Water (cups)',
                  color: '${textColor}'
                },
                grid: {
                  color: '${gridColor}'
                },
                ticks: {
                  color: '${textColor}'
                }
              },
              ${config.showFatigue ? `
              y1: {
                position: 'right',
                beginAtZero: true,
                min: 0,
                max: 5,
                title: {
                  display: true,
                  text: 'Fatigue Level',
                  color: '${textColor}'
                },
                grid: {
                  display: false
                },
                ticks: {
                  color: '${textColor}',
                  stepSize: 1
                }
              },
              ` : ''}
              x: {
                grid: {
                  color: '${gridColor}'
                },
                ticks: {
                  color: '${textColor}',
                  maxRotation: 45,
                  minRotation: 45
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Water Consumption${config.showFatigue ? ' & Fatigue Level' : ''}',
                color: '${textColor}',
                font: {
                  size: 16
                }
              },
              legend: {
                labels: {
                  color: '${textColor}'
                }
              }
            }
          }
        });
        
        // Add some debugging
        console.log('Chart created with theme: ${theme}, bgColor: ${bgColor}');
        document.body.style.backgroundColor = '${bgColor}';
      </script>
    </body>
    </html>
  `;
}; 