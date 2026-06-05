let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const getSocketIO = () => ioInstance;

const emitAttendanceEvent = (event, payload) => {
  if (!ioInstance) return;

  ioInstance.emit(event, payload);
  ioInstance.emit("attendance:updated", {
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  setSocketIO,
  getSocketIO,
  emitAttendanceEvent,
};
