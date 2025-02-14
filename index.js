const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store users per room
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (rooms[roomId].length >= 4) {
      socket.emit("room-full");
      return;
    }

    rooms[roomId].push(socket.id);
    socket.join(roomId);

    // Send existing users to the newly joined user
    socket.emit("users", rooms[roomId].filter((id) => id !== socket.id));

    // Notify other users in the room
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", (data) => {
    io.to(data.to).emit("offer", { from: data.from, offer: data.offer });
  });

  socket.on("answer", (data) => {
    io.to(data.to).emit("answer", { from: data.from, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    io.to(data.to).emit("ice-candidate", { from: data.from, candidate: data.candidate });
  });

  socket.on("disconnect", () => {
    let roomId = null;

    // Find the user's room and remove them
    for (const [key, users] of Object.entries(rooms)) {
      if (users.includes(socket.id)) {
        roomId = key;
        rooms[key] = users.filter((id) => id !== socket.id);
        break;
      }
    }

    if (roomId) {
      io.to(roomId).emit("user-disconnected", socket.id);
      io.to(roomId).emit("users", rooms[roomId]); // Update remaining users
    }

    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
