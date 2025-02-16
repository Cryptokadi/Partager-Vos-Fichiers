// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

let visitorCount = 0;

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));

// Route pour récupérer le nombre de visiteurs
app.get('/api/visitors', (req, res) => {
    res.json({ visitors: visitorCount });
});

// Route pour incrémenter le compteur de visiteurs
app.post('/api/increment', (req, res) => {
    visitorCount++;
    res.json({ visitors: visitorCount });
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
