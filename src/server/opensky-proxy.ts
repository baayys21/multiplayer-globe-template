// Jalankan perintah berikut sebelum menjalankan server ini:
// npm install express node-fetch cors
// npm install --save-dev @types/express @types/cors @types/node

import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get('/api/opensky', async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://opensky-network.org/api/states/all');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OpenSky data' });
  }
});

app.listen(PORT, () => {
  console.log(`OpenSky proxy server running on port ${PORT}`);
}); 