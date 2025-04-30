const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.RENDER_EXTERNAL_URL 
    : ['http://localhost:3000', 'http://192.168.88.222:3000']
}));

// Serve static files from the React app in production
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.RENDER_EXTERNAL_URL
      : ['http://localhost:3000', 'http://192.168.88.222:3000'],
    methods: ["GET", "POST"]
  }
});

let submissions = [];

app.get('/api/health', (req, res) => {
  res.send('Word Cloud Server Running');
});

app.post('/submit', express.json(), (req, res) => {
  const { text } = req.body;
  if (text) {
    submissions.push(text);
    io.emit('submissions-updated', submissions);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No text provided' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('submit-text', (text) => {
    if (typeof text === 'string' && text.trim()) {
      submissions.push(text.trim());
      io.emit('submissions-updated', submissions);
      console.log('New submission received:', text.trim());
    }
  });

  socket.on('get-submissions', () => {
    socket.emit('submissions-updated', submissions);
  });

  socket.on('clear-submissions', () => {
    submissions = [];
    io.emit('submissions-updated', submissions);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`Application available at: ${process.env.RENDER_EXTERNAL_URL}`);
  }
}); 