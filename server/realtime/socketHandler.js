const { db } = require('../db/database');

function initSocketIO(io) {
  io.on('connection', (socket) => {
    // Join Café Session Room (by session code or session ID)
    socket.on('join_cafe_session', ({ sessionId, code, deviceType = 'customer', userName = 'Coffee Lover' }) => {
      let session = null;
      if (sessionId) {
        session = db.prepare('SELECT * FROM cafe_sessions WHERE id = ?').get(sessionId);
      } else if (code) {
        session = db.prepare('SELECT * FROM cafe_sessions WHERE code = ?').get(code.trim());
      }

      if (!session) {
        socket.emit('session_error', { message: 'Café session not found or expired.' });
        return;
      }

      const roomName = `session_${session.id}`;
      socket.join(roomName);
      socket.data.sessionId = session.id;
      socket.data.deviceType = deviceType;

      // Update connected count
      const room = io.sockets.adapter.rooms.get(roomName);
      const deviceCount = room ? room.size : 1;

      db.prepare('UPDATE cafe_sessions SET connected_devices = ? WHERE id = ?').run(deviceCount, session.id);

      // Acknowledge connection to joining socket
      socket.emit('session_joined_success', {
        session: {
          ...session,
          connected_devices: deviceCount,
          currentDraft: session.current_draft ? JSON.parse(session.current_draft) : null
        }
      });

      // Broadcast to other devices in this café session
      socket.to(roomName).emit('device_connected_alert', {
        deviceType,
        userName,
        deviceCount,
        message: `${deviceType === 'customer' ? '📱 Mobile Device' : '💻 Café World'} connected to session!`,
        timestamp: Date.now()
      });
    });

    // Two-way live coffee builder synchronization
    socket.on('sync_live_draft', ({ sessionId, draft, sourceDevice }) => {
      if (!sessionId || !draft) return;

      const roomName = `session_${sessionId}`;
      try {
        db.prepare('UPDATE cafe_sessions SET current_draft = ? WHERE id = ?').run(
          JSON.stringify(draft),
          sessionId
        );
      } catch (e) {
        console.error('Failed to persist draft in socket update:', e);
      }

      // Broadcast to other devices in room (not back to sender)
      socket.to(roomName).emit('live_draft_updated', {
        draft,
        sourceDevice,
        timestamp: Date.now()
      });
    });

    // Touch Cup Design Transfer
    socket.on('transfer_cup_design', ({ sessionId, drawingData, artistName }) => {
      if (!sessionId || !drawingData) return;

      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('new_cup_design', {
        drawingData,
        artistName: artistName || 'Customer Artist',
        timestamp: Date.now()
      });
    });

    // Staff room for kitchen display system
    socket.on('join_staff_room', () => {
      socket.join('staff_room');
      socket.emit('staff_room_joined', { message: 'Connected to live Barista operations channel' });
    });

    // Delivery tracking room
    socket.on('join_delivery_room', ({ orderId }) => {
      if (orderId) {
        socket.join(`delivery_${orderId}`);
        socket.emit('delivery_room_joined', { orderId });
      }
    });

    // Session status progression event (Preparing -> Ready -> Completed)
    socket.on('session_status_update', ({ sessionId, status, tableNumber = 7 }) => {
      const roomName = sessionId ? `session_${sessionId}` : null;
      const payload = {
        status,
        table_number: tableNumber,
        cafe_session_id: sessionId
      };

      io.emit('order_status_updated', payload);
      if (roomName) {
        io.to(roomName).emit('session_order_updated', payload);
      }
      if (status === 'ready') {
        io.emit('order_ready_alert', {
          orderNumber: 104,
          guestName: 'Café Customer',
          tableNumber
        });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      if (socket.data.sessionId) {
        const roomName = `session_${socket.data.sessionId}`;
        const room = io.sockets.adapter.rooms.get(roomName);
        const deviceCount = room ? room.size : 0;

        try {
          db.prepare('UPDATE cafe_sessions SET connected_devices = ? WHERE id = ?').run(
            Math.max(0, deviceCount),
            socket.data.sessionId
          );
        } catch (e) {}

        socket.to(roomName).emit('device_disconnected_alert', {
          deviceType: socket.data.deviceType || 'device',
          deviceCount,
          timestamp: Date.now()
        });
      }
    });
  });
}

module.exports = { initSocketIO };
