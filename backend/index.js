require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./src/models/message');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// ✅ Cleaned allowed origins (no trailing slash)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://rizeosf.netlify.app"
];

// ✅ Apply CORS for REST API
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Apply JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ Socket.IO with same CORS config
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

require('./config/db');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RiseOZ Backend API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ROUTES
const freelancerRoutes = require('./src/routes/freelancerRoute');
const producerRoutes = require('./src/routes/producerRoute');
const authRoutes = require('./src/routes/authRoute');
const connectionRoutes = require('./src/routes/connectionRoute');
const channeliRoutes = require('./src/routes/channeliRoute');
const aiRoutes = require('./src/utils/aiRoutes');

app.use('', authRoutes);
app.use('', connectionRoutes);
app.use('', channeliRoutes);
app.use('', aiRoutes);
app.use('/freelancer', freelancerRoutes);
app.use('/producer', producerRoutes);
app.use('/chat', require('./src/routes/chatRoute'));

// ✅ Socket.IO events
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', ({ senderId, senderRole }) => {
    const room = `${senderRole}-${senderId}`;
    socket.join(room);
    console.log(`User ${senderId} with role ${senderRole} joined room ${room}`);
  });

  socket.on('sendMessage', async (messageData) => {
    const { senderId, senderRole, receiverId, receiverRole, content } = messageData;

    const message = new Message({
      sender: senderId,
      senderRole,
      receiver: receiverId,
      receiverRole,
      content,
      timestamp: new Date()
    });

    await message.save();

    const room = `${receiverRole}-${receiverId}`;
    io.to(room).emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
