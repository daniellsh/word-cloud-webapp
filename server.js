const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.RENDER_EXTERNAL_URL 
    : ['http://localhost:3000', 'http://192.168.88.222:3000']
}));
app.use(express.json());

// Serve static files from the React app
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

// Helper function to detect if text contains Chinese characters
function containsChinese(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}

// Helper function to process text based on language
function processText(text) {
  if (!text) return [];
  
  // Trim the text and return it as a single entry regardless of language
  const trimmedText = text.trim();
  return trimmedText ? [trimmedText] : [];
}

// API Routes
app.get('/api/health', (req, res) => {
  res.send('Word Cloud Server Running');
});

app.post('/api/submit', express.json(), (req, res) => {
  const { text } = req.body;
  if (text) {
    const processedText = processText(text);
    submissions.push(...processedText);
    io.emit('submissions-updated', submissions);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No text provided' });
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('submit-text', (text) => {
    if (typeof text === 'string' && text.trim()) {
      const processedText = processText(text);
      submissions.push(...processedText);
      io.emit('submissions-updated', submissions);
      console.log('New submission received:', processedText);
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

// Serve React app for all other routes
app.get('*', (req, res) => {
  console.log('Serving index.html for path:', req.path);
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