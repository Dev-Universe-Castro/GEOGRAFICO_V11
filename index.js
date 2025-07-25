
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Redirect all requests to Flask server on port 5000
app.use('*', (req, res) => {
    res.redirect(`http://0.0.0.0:5000${req.originalUrl}`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Redirecionando para Flask server na porta 5000...`);
});
