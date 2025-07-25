// Chart management and visualization
let cropChart = null;

function loadCropChart(cropName) {
    console.log(`Loading chart for crop: ${cropName}`);
    
    // Show chart container, hide placeholder
    document.getElementById('crop-chart').style.display = 'block';
    document.getElementById('chart-placeholder').style.display = 'none';
    
    // Fetch chart data
    fetch(`/api/crop-chart-data/${encodeURIComponent(cropName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                createCropChart(data.chart_data);
            } else {
                console.error('Error loading chart data:', data.error);
                showChartError('Erro ao carregar dados do gráfico');
            }
        })
        .catch(error => {
            console.error('Network error loading chart:', error);
            showChartError('Erro de conexão ao carregar gráfico');
        });
}

function createCropChart(chartData) {
    const ctx = document.getElementById('crop-chart').getContext('2d');
    
    // Destroy existing chart
    if (cropChart) {
        cropChart.destroy();
    }
    
    // Obter cor selecionada ou usar padrão
    const selectedColor = document.getElementById('chart-color-picker')?.value || '#4CAF50';
    
    const config = {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Hectares Colhidos',
                data: chartData.data,
                backgroundColor: generateSequentialColors(chartData.data.length, selectedColor),
                borderColor: selectedColor,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Top 20 Municípios - ${chartData.crop_name}`,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    color: '#2E7D32'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.x.toLocaleString('pt-BR')} hectares`;
                        }
                    }
                }
            },
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR');
                        }
                    },
                    title: {
                        display: true,
                        text: 'Hectares Colhidos'
                    }
                },
                y: {
                    ticks: {
                        maxTicksLimit: 20,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        }
    };
    
    // Create chart
    cropChart = new Chart(ctx, config);
    
    console.log('Chart created successfully');
}

function generateSequentialColors(count, baseColor = '#4CAF50') {
    const colors = [];
    
    // Converter hex para RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };
    
    // Converter RGB para HSL para melhor controle de luminosidade
    const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Converter HSL para RGB
    const hslToRgb = (h, s, l) => {
        h /= 360; s /= 100; l /= 100;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    };

    const baseRgb = hexToRgb(baseColor);
    if (!baseRgb) return ['#4CAF50']; // fallback
    
    const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    
    // Criar escala sequencial do claro para escuro
    for (let i = 0; i < count; i++) {
        // Normalizar o índice (valores maiores = cores mais escuras)
        const normalized = i / (count - 1);
        
        // Ajustar luminosidade: do claro (85%) para escuro (20%)
        const lightness = 85 - (normalized * 65);
        
        // Ajustar saturação ligeiramente para melhor contraste
        const saturation = Math.max(20, baseHsl.s - (normalized * 10));
        
        const newRgb = hslToRgb(baseHsl.h, saturation, lightness);
        const newHex = `#${((1 << 24) + (newRgb.r << 16) + (newRgb.g << 8) + newRgb.b).toString(16).slice(1)}`;
        
        colors.push(newHex);
    }
    
    return colors;
}

function showChartError(message) {
    document.getElementById('crop-chart').style.display = 'none';
    
    const placeholder = document.getElementById('chart-placeholder');
    placeholder.innerHTML = `
        <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
        <p class="text-muted">${message}</p>
    `;
    placeholder.style.display = 'block';
}

function clearChart() {
    if (cropChart) {
        cropChart.destroy();
        cropChart = null;
    }
    
    document.getElementById('crop-chart').style.display = 'none';
    
    const placeholder = document.getElementById('chart-placeholder');
    placeholder.innerHTML = `
        <i class="fas fa-chart-bar fa-3x mb-3 opacity-25"></i>
        <p>Selecione uma cultura para visualizar o gráfico</p>
    `;
    placeholder.style.display = 'block';
}

// Initialize chart management
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Chart.js uses the correct bar chart type
    if (typeof Chart !== 'undefined') {
        Chart.defaults.set('plugins.legend', {
            display: false
        });
    }
});

function updateChartColors(newColor) {
    if (cropChart) {
        const newColors = generateSequentialColors(cropChart.data.datasets[0].data.length, newColor);
        cropChart.data.datasets[0].backgroundColor = newColors;
        cropChart.data.datasets[0].borderColor = newColor;
        cropChart.update();
    }
}

// Export functions for global use
window.loadCropChart = loadCropChart;
window.clearChart = clearChart;
window.updateChartColors = updateChartColors;
