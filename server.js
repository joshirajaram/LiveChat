const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');

const admin = 'admin';

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
    socket.on('joinRoom', ({username, room }) => {

        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome connected user - Emits only to connected user
        socket.emit('message', formatMessage(admin, 'Welcome to LiveChat'));
    
        // Broadcast when user connects - Emits to everyone except connected user
        socket.broadcast.to(user.room).emit('message', formatMessage(admin, `${user.username} has joined the Chat!`));

        // Send users and room info
        io.to(user.room).emit('roomUsers', { 
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    
    // Listen for chat message
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects - Emits to everyone in the room
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user) {
            io.to(user.room).emit('message', formatMessage(admin, `${user.username} has left the Chat.`));
            
            // Send users and room info
            io.to(user.room).emit('roomUsers', { 
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));