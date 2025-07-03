// Jalankan perintah berikut sebelum menjalankan server ini:
// npm install express node-fetch cors
// npm install --save-dev @types/express @types/cors @types/node

// @ts-ignore
const express = require('express');
// @ts-ignore
const nodeFetch = require('node-fetch');
// @ts-ignore
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get('/api/opensky', async (req, res) => {
  try {
    const response = await nodeFetch('https://opensky-network.org/api/states/all');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OpenSky data' });
  }
});

app.listen(PORT, () => {
  console.log(`OpenSky proxy server running on port ${PORT}`);
}); 