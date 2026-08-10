const os = require('os');
os.homedir = () => '/Users/yashrajshivajiauti/Documents/college-timetable-system/tmp';

const express = require('express');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use((req, res) => handle(req, res));
  server.listen(3000, () => {
    console.log('> Next.js Frontend server ready on http://localhost:3000');
  });
}).catch(err => {
  console.error('Error starting Next.js:', err);
  process.exit(1);
});
