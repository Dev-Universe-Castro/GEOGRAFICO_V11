// Map management and visualization
let map;
let currentLayer;
let currentCropData = {};
let currentCropName = '';
let cropMinMax = { min: 0, max: 1000 };
let currentStateFilter = null;
let allMunicipalitiesData = null;
let radiusMode = false;
let radiusCircle = null;
let radiusCenter = null;
let radiusKm = 50;

function initializeMap() {
    // Initialize map centered on Brazil
    map = L.map('map').setView([-14.2350, -51.9253], 5);
    
    // Make map globally accessible
    window.map = map;

    // Add Grayscale tile layer with better visibility
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        className: 'grayscale-tiles'
    }).addTo(map);

    // Set more reasonable bounds for Brazil
    const brazilBounds = [
        [-33.75, -73.99],  // Southwest
        [5.27, -28.84]     // Northeast  
    ];
    
    // Don't restrict bounds too strictly initially
    map.setMinZoom(4);
    map.setMaxZoom(18);
    
    // Fit to Brazil bounds initially with padding
    map.fitBounds(brazilBounds, {
        padding: [50, 50]
    });

    // Welcome message removed - no longer needed

    // Setup radius mode click handler
    map.on('click', function(e) {
        if (radiusMode) {
            setRadiusCenter(e.latlng);
        }
    });

    console.log('Map initialized successfully with bounds:', brazilBounds);
}

function loadCropLayer(cropName) {
    console.log(`Loading crop layer for: ${cropName}`);

    // Show loading state - check if button exists
    const loadBtn = document.getElementById('load-layer-btn');
    let originalText = '';
    if (loadBtn) {
        originalText = loadBtn.innerHTML;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Carregando...';
        loadBtn.disabled = true;
    }

    // Fetch crop data
    fetch(`/api/crop-data/${encodeURIComponent(cropName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentCropData = data.data;
                currentCropName = cropName;

                // Calculate min/max for this specific crop
                const values = Object.values(currentCropData)
                    .map(item => item.harvested_area)
                    .filter(value => value > 0);

                if (values.length > 0) {
                    cropMinMax.min = Math.min(...values);
                    cropMinMax.max = Math.max(...values);
                } else {
                    cropMinMax = { min: 0, max: 1000 };
                }

                loadMunicipalityBoundaries(cropName);
            } else {
                console.error('Error loading crop data:', data.error);
                alert('Erro ao carregar dados da cultura: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Network error:', error);
            alert('Erro de conexão ao carregar dados da cultura');
        })
        .finally(() => {
            if (loadBtn) {
                loadBtn.innerHTML = originalText;
                loadBtn.disabled = false;
            }
        });
}

function loadMunicipalityBoundaries(cropName) {
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Try to load the most complete GeoJSON file available
    const geoJsonFiles = [
        '/static/data/brazil_municipalities_all.geojson',
        '/attached_assets/brazil_municipalities_all_1752980285489.geojson',
        '/static/data/brazil_municipalities_combined.geojson',
        '/static/data/br_municipalities_simplified.geojson'
    ];

    let fileLoaded = false;

    async function tryLoadGeoJSON() {
        for (const filePath of geoJsonFiles) {
            try {
                console.log(`Tentando carregar: ${filePath}`);
                const response = await fetch(filePath);
                if (response.ok) {
                    const geoData = await response.json();
                    console.log(`GeoJSON carregado com sucesso: ${filePath}, ${geoData.features.length} municípios`);
                    
                    // Store all municipalities data
                    allMunicipalitiesData = geoData;
                    
                    // Apply state filter if one is selected
                    const filteredData = applyStateFilter(geoData);
                    
                    currentLayer = L.geoJSON(filteredData, {
                        style: function(feature) {
                            return getFeatureStyle(feature, cropName);
                        },
                        onEachFeature: function(feature, layer) {
                            setupFeaturePopup(feature, layer, cropName);
                        }
                    }).addTo(map);

                    // Fit map to layer bounds (focused on filtered state if applicable)
                    if (currentLayer.getBounds().isValid()) {
                        map.fitBounds(currentLayer.getBounds());
                    }

                    // Update legend
                    updateMapLegend(cropName);
                    fileLoaded = true;
                    break;
                }
            } catch (error) {
                console.log(`Erro ao carregar ${filePath}:`, error);
                continue;
            }
        }

        if (!fileLoaded) {
            console.error('Nenhum arquivo GeoJSON pôde ser carregado');
            createFallbackVisualization(cropName);
        }
    }

    tryLoadGeoJSON();
}

function createFallbackVisualization(cropName) {
    console.log('Creating fallback visualization for:', cropName);
    
    // Create sample markers for demonstration when GeoJSON is not available
    const sampleCities = [
        { name: "São Paulo", lat: -23.5505, lng: -46.6333, state: "SP" },
        { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, state: "RJ" },
        { name: "Brasília", lat: -15.7942, lng: -47.8822, state: "DF" },
        { name: "Salvador", lat: -12.9714, lng: -38.5014, state: "BA" },
        { name: "Fortaleza", lat: -3.7172, lng: -38.5433, state: "CE" },
        { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345, state: "MG" },
        { name: "Curitiba", lat: -25.4244, lng: -49.2654, state: "PR" },
        { name: "Porto Alegre", lat: -30.0346, lng: -51.2177, state: "RS" },
        { name: "Manaus", lat: -3.1190, lng: -60.0217, state: "AM" },
        { name: "Belém", lat: -1.4558, lng: -48.5044, state: "PA" },
        { name: "Goiânia", lat: -16.6869, lng: -49.2648, state: "GO" },
        { name: "Recife", lat: -8.0476, lng: -34.8770, state: "PE" }
    ];

    currentLayer = L.layerGroup();

    sampleCities.forEach((city, index) => {
        const area = (index + 1) * 10000 + Math.random() * 30000; // Varied area for demonstration
        const color = getColorForValue(area, 10000, 150000);

        const marker = L.circleMarker([city.lat, city.lng], {
            radius: Math.max(8, Math.sqrt(area / 5000)),
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <strong>${city.name} (${city.state})</strong><br>
            Cultura: ${cropName}<br>
            Área Colhida: ${area.toLocaleString('pt-BR', {maximumFractionDigits: 0})} hectares<br>
            <em>Dados de demonstração</em>
        `);

        currentLayer.addLayer(marker);
    });

    currentLayer.addTo(map);
    
    // Set appropriate bounds
    cropMinMax = { min: 10000, max: 150000 };

    // Update legend
    updateMapLegend(cropName);

    console.log('Fallback visualization created with', sampleCities.length, 'cities');
}

function getFeatureStyle(feature, cropName) {
    // Try multiple ways to get municipality code from GeoJSON
    const municipalityCode = feature.properties.GEOCODIGO || 
                           feature.properties.CD_MUN || 
                           feature.properties.cd_geocmu || 
                           feature.properties.geocodigo ||
                           feature.properties.CD_GEOCMU;
    
    const cropData = currentCropData[municipalityCode];

    if (!cropData || !cropData.harvested_area || cropData.harvested_area === 0) {
        // Municípios sem dados - cor cinza claro
        return {
            fillColor: '#E8E8E8',
            weight: 0.3,
            opacity: 0.8,
            color: '#CCCCCC',
            fillOpacity: 0.6
        };
    }

    const area = cropData.harvested_area;
    const color = getColorForValue(area, cropMinMax.min, cropMinMax.max);

    return {
        fillColor: color,
        weight: 0.3,
        opacity: 0.8,
        color: '#666666',
        fillOpacity: 0.7
    };
}

function setupFeaturePopup(feature, layer, cropName) {
    // Try multiple ways to get municipality info from GeoJSON
    const municipalityCode = feature.properties.GEOCODIGO || feature.properties.CD_MUN || feature.properties.cd_geocmu || feature.properties.geocodigo;
    const municipalityName = feature.properties.NOME || feature.properties.NM_MUN || feature.properties.nm_mun || feature.properties.nome || 'Nome não disponível';
    const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;
    const cropData = currentCropData[municipalityCode];

    let popupContent = `<strong>${municipalityName}</strong>`;
    if (stateUF) {
        popupContent += ` (${stateUF})`;
    }
    popupContent += `<br>`;

    if (cropData && cropData.harvested_area) {
        popupContent += `
            Cultura: ${cropName}<br>
            Área Colhida: ${cropData.harvested_area.toLocaleString('pt-BR')} hectares<br>
            Código: ${municipalityCode}
        `;
    } else {
        popupContent += `
            Cultura: ${cropName}<br>
            <em>Dados não disponíveis</em><br>
            Código: ${municipalityCode || 'N/A'}
        `;
    }

    layer.bindPopup(popupContent);
}

function getMinMaxValues() {
    return cropMinMax;
}

function getColorForValue(value, min, max) {
    // Obter cor base selecionada
    const selectedColor = document.getElementById('color-selector')?.value || '#4CAF50';

    // Se valor é 0 ou negativo, mas queremos cor de 1ha, usar 1
    if (value <= 0) value = 1;

    // Ajustar os valores mínimo e máximo para melhor distribuição
    const adjustedMin = Math.max(min, 1);
    const adjustedMax = Math.max(max, adjustedMin * 10);

    // Use escala logarítmica para melhor distribuição
    const logMin = Math.log(adjustedMin);
    const logMax = Math.log(adjustedMax);
    const logValue = Math.log(Math.max(value, adjustedMin));
    const normalized = (logValue - logMin) / (logMax - logMin);

    // Gerar cor sequencial baseada na cor selecionada
    return generateSequentialColor(normalized, selectedColor);
}

function generateSequentialColor(normalized, baseColor) {
    // Converter hex para RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Converter RGB para HSL
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
    if (!baseRgb) return baseColor;
    
    const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    
    // Criar escala sequencial: valores maiores = cores mais escuras
    // Luminosidade varia de 85% (claro) para 15% (escuro)
    const lightness = 85 - (normalized * 70);
    
    // Manter matiz, ajustar levemente a saturação
    const saturation = Math.max(20, baseHsl.s - (normalized * 10));
    
    const newRgb = hslToRgb(baseHsl.h, saturation, lightness);
    return `#${((1 << 24) + (newRgb.r << 16) + (newRgb.g << 8) + newRgb.b).toString(16).slice(1)}`;
}

let currentLegendControl = null;

function updateMapLegend(cropName, filteredCount = null) {
    // Remove existing legend
    if (currentLegendControl) {
        map.removeControl(currentLegendControl);
        currentLegendControl = null;
    }

    const { min, max } = cropMinMax;
    
    // Ajustar valores para melhor visualização
    const adjustedMin = Math.max(min, 1);
    const adjustedMax = Math.max(max, adjustedMin * 10);

    currentLegendControl = L.control({ position: 'bottomright' });
    currentLegendControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');

        let legendHTML = `<h6><i class="fas fa-seedling"></i> ${cropName}</h6>`;
        if (radiusCenter && filteredCount !== null) {
            legendHTML += `<div style="font-size: 10px; margin-bottom: 8px; color: #FF4444; font-weight: 600;">
                <i class="fas fa-map-marker-alt"></i> Raio: ${radiusKm}km (${filteredCount} municípios)
            </div>`;
        }
        legendHTML += `<div style="font-size: 11px; margin-bottom: 5px;">Hectares Colhidos</div>`;

        // Create color scale com distribuição logarítmica usando cor selecionada
        const selectedColor = document.getElementById('color-selector')?.value || '#4CAF50';
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            let value;
            if (i === 0) {
                value = adjustedMin;
            } else if (i === steps - 1) {
                value = adjustedMax;
            } else {
                // Distribuição logarítmica
                const logMin = Math.log(adjustedMin);
                const logMax = Math.log(adjustedMax);
                const logValue = logMin + (logMax - logMin) * (i / (steps - 1));
                value = Math.exp(logValue);
            }
            
            const color = getColorForValue(value, adjustedMin, adjustedMax);
            const displayValue = value < 1000 ? 
                value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) :
                (value / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + 'k';

            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color}; width: 18px; height: 18px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                    <span style="font-size: 10px;">${displayValue} ha</span>
                </div>
            `;
        }

        legendHTML += `
            <div class="legend-item mt-2" style="font-size: 10px; color: #666;">
                <div class="legend-color" style="background-color: #F5F5F5; width: 18px; height: 18px; display: inline-block; margin-right: 5px; border: 1px solid #ccc;"></div>
                <span>Sem dados</span>
            </div>
        `;

        div.innerHTML = legendHTML;
        return div;
    };
    currentLegendControl.addTo(map);

    console.log(`Legend updated for ${cropName}: ${adjustedMin.toLocaleString()} - ${adjustedMax.toLocaleString()} ha`);
}

// Data is now static, no processing needed
function processData() {
    showStatus('Dados já estão carregados estaticamente!', 'info');
}

function createGeoJSONVisualization(cropData, cropName) {
    // Clear existing layers
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Create color scale based on data
    const values = Object.values(cropData).map(d => d.harvested_area);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Update legend
    updateLegend(cropName, minValue, maxValue);

    // Create markers for municipalities with data
    const markers = [];
    for (const [municipalityCode, data] of Object.entries(cropData)) {
        // Use approximate coordinates (this would need a proper geocoding service)
        const lat = -15 + (Math.random() - 0.5) * 20; // Random lat between -25 and -5
        const lng = -50 + (Math.random() - 0.5) * 30; // Random lng between -65 and -35

        const color = getColorForValue(data.harvested_area, minValue, maxValue);

        const marker = L.circleMarker([lat, lng], {
            radius: Math.sqrt(data.harvested_area / maxValue) * 20 + 5,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`
            <strong>${data.municipality_name} (${data.state_code})</strong><br>
            Cultura: ${cropName}<br>
            Área Colhida: ${data.harvested_area.toLocaleString()} hectares
        `);

        markers.push(marker);
    }

    currentLayer = L.layerGroup(markers).addTo(map);
    console.log('Fallback visualization created');
}

function updateLegend(cropName, minValue, maxValue) {
    const legendElement = document.getElementById('legend');
    if (!legendElement) {
        console.warn('Legend element not found - this is expected as we use map legend control instead');
        return;
    }

    try {
        legendElement.innerHTML = `
            <h4>${cropName}</h4>
            <div class="legend-scale">
                <div class="legend-labels">
                    <span class="legend-min">${minValue.toLocaleString()} ha</span>
                    <span class="legend-max">${maxValue.toLocaleString()} ha</span>
                </div>
                <div class="legend-gradient"></div>
            </div>
        `;
        console.log(`Legend updated for ${cropName}: ${minValue} - ${maxValue} ha`);
    } catch (error) {
        console.warn('Error updating legend:', error);
    }
}


function applyStateFilter(geoData) {
    if (!currentStateFilter) {
        return geoData;
    }
    
    const filteredFeatures = geoData.features.filter(feature => {
        const stateUF = feature.properties.UF || feature.properties.SIGLA_UF || feature.properties.uf;
        return stateUF === currentStateFilter;
    });
    
    return {
        type: "FeatureCollection",
        features: filteredFeatures
    };
}

function filterByStateOnMap(stateCode) {
    currentStateFilter = stateCode;
    
    // If we have loaded data and a crop is selected, reload the layer with the filter
    if (allMunicipalitiesData && currentCropName) {
        // Remove existing layer
        if (currentLayer) {
            map.removeLayer(currentLayer);
        }
        
        // Apply state filter
        const filteredData = applyStateFilter(allMunicipalitiesData);
        
        // Create new layer with filtered data
        currentLayer = L.geoJSON(filteredData, {
            style: function(feature) {
                return getFeatureStyle(feature, currentCropName);
            },
            onEachFeature: function(feature, layer) {
                setupFeaturePopup(feature, layer, currentCropName);
            }
        }).addTo(map);

        // Fit map to layer bounds (focused on filtered state if applicable)
        if (currentLayer.getBounds().isValid()) {
            map.fitBounds(currentLayer.getBounds());
        } else if (!stateCode) {
            // If no state filter, reset to Brazil bounds
            const brazilBounds = [
                [-33.7683777809, -73.98283055299],  // Southwest
                [5.2842873834, -28.84765906699]     // Northeast  
            ];
            map.fitBounds(brazilBounds);
        }

        // Update legend
        updateMapLegend(currentCropName);
    }
}

function toggleRadiusMode() {
    radiusMode = !radiusMode;
    const toggleBtn = document.getElementById('radius-toggle');
    const radiusInfo = document.getElementById('radius-info');
    
    if (radiusMode) {
        toggleBtn.classList.remove('btn-outline-success');
        toggleBtn.classList.add('btn-success');
        toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        radiusInfo.style.display = 'block';
        map.getContainer().style.cursor = 'crosshair';
    } else {
        toggleBtn.classList.remove('btn-success');
        toggleBtn.classList.add('btn-outline-success');
        toggleBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        radiusInfo.style.display = 'none';
        map.getContainer().style.cursor = '';
    }
}

function setRadiusCenter(latlng) {
    radiusCenter = latlng;
    radiusKm = parseInt(document.getElementById('radius-input').value) || 50;
    
    // Remove existing circle
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    
    // Create new circle
    radiusCircle = L.circle(latlng, {
        color: '#FF4444',
        fillColor: '#FF4444',
        fillOpacity: 0.2,
        radius: radiusKm * 1000 // Convert km to meters
    }).addTo(map);
    
    // Add popup to center
    const centerMarker = L.marker(latlng, {
        icon: L.divIcon({
            className: 'radius-center-marker',
            html: '<div style="background: #FF4444; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px;"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(map);
    
    centerMarker.bindPopup(`
        <strong>Centro do Raio</strong><br>
        Raio: ${radiusKm} km<br>
        Lat: ${latlng.lat.toFixed(4)}<br>
        Lng: ${latlng.lng.toFixed(4)}
    `);
    
    // Show clear button
    document.getElementById('clear-radius').style.display = 'block';
    
    // Exit radius mode
    toggleRadiusMode();
    
    // Filter data if crop is selected
    const selectedCrop = document.getElementById('crop-selector').value;
    if (selectedCrop) {
        filterByRadius(selectedCrop);
    }
}

function clearRadius() {
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
        radiusCircle = null;
    }
    
    // Remove center marker
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'radius-center-marker') {
            map.removeLayer(layer);
        }
    });
    
    radiusCenter = null;
    document.getElementById('clear-radius').style.display = 'none';
    
    // Reload current crop without radius filter
    const selectedCrop = document.getElementById('crop-selector').value;
    if (selectedCrop) {
        loadCropLayer(selectedCrop);
    }
}

function filterByRadius(cropName) {
    if (!radiusCenter || !allMunicipalitiesData) return;
    
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }
    
    // Filter features by distance
    const filteredFeatures = allMunicipalitiesData.features.filter(feature => {
        if (!feature.geometry || !feature.geometry.coordinates) return false;
        
        // Get feature center (approximate)
        let featureCenter;
        if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            const lats = coords.map(coord => coord[1]);
            const lngs = coords.map(coord => coord[0]);
            featureCenter = {
                lat: lats.reduce((a, b) => a + b) / lats.length,
                lng: lngs.reduce((a, b) => a + b) / lngs.length
            };
        } else if (feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.coordinates[0][0];
            const lats = coords.map(coord => coord[1]);
            const lngs = coords.map(coord => coord[0]);
            featureCenter = {
                lat: lats.reduce((a, b) => a + b) / lats.length,
                lng: lngs.reduce((a, b) => a + b) / lngs.length
            };
        } else {
            return false;
        }
        
        // Calculate distance
        const distance = calculateDistance(
            radiusCenter.lat, radiusCenter.lng,
            featureCenter.lat, featureCenter.lng
        );
        
        return distance <= radiusKm;
    });
    
    const filteredData = {
        type: "FeatureCollection",
        features: filteredFeatures
    };
    
    // Create new layer with filtered data
    currentLayer = L.geoJSON(filteredData, {
        style: function(feature) {
            return getFeatureStyle(feature, cropName);
        },
        onEachFeature: function(feature, layer) {
            setupFeaturePopup(feature, layer, cropName);
        }
    }).addTo(map);
    
    // Update legend with radius info
    updateMapLegend(cropName, filteredFeatures.length);
    
    console.log(`Filtered ${filteredFeatures.length} municipalities within ${radiusKm}km radius`);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Test function to ensure map is working
function testMapVisibility() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    console.log('Map center:', map.getCenter());
    console.log('Map zoom:', map.getZoom());
    console.log('Map bounds:', map.getBounds());
    
    // Add a test marker to verify map is working
    const testMarker = L.marker([-14.2350, -51.9253]).addTo(map);
    testMarker.bindPopup('Centro do Brasil - Teste de Visualização').openPopup();
    
    setTimeout(() => {
        map.removeLayer(testMarker);
    }, 3000);
}

// Export functions for global use
window.initializeMap = initializeMap;
window.loadCropLayer = loadCropLayer;
window.filterByStateOnMap = filterByStateOnMap;
window.toggleRadiusMode = toggleRadiusMode;
window.clearRadius = clearRadius;
window.testMapVisibility = testMapVisibility;