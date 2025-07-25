
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// API routes
app.get('/api/crops', (req, res) => {
    try {
        const cropData = require('./data/crop_data_static.json');
        const crops = Object.keys(cropData);
        res.json({ success: true, crops: crops });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/crop-data/:cropName', (req, res) => {
    try {
        const cropData = require('./data/crop_data_static.json');
        const cropName = req.params.cropName;
        const data = cropData[cropName] || {};
        res.json({ success: true, data: data });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/statistics', (req, res) => {
    try {
        const cropData = require('./data/crop_data_static.json');
        const crops = Object.keys(cropData);
        let totalMunicipalities = 0;
        
        crops.forEach(crop => {
            const municipalities = Object.keys(cropData[crop] || {});
            totalMunicipalities = Math.max(totalMunicipalities, municipalities.length);
        });
        
        res.json({
            success: true,
            total_crops: crops.length,
            total_municipalities: totalMunicipalities
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
