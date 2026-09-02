import { app } from './app.js';

const port = Number(process.env.API_PORT) || 3000;
const host = process.env.API_HOST || 'localhost';

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
