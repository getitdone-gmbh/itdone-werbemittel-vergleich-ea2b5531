'use strict';

const express = require('express');
const path = require('path');
const { categories, manufacturers, products } = require('./data');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/catalog', (req, res) => {
  res.json({ categories, manufacturers, products });
});

app.get('/health', (req, res) => res.send('ok'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Werbemittel-Vergleich läuft auf Port ${PORT}`);
});
