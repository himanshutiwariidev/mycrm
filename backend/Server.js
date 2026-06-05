const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectedDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const taskRoutes = require("./routes/taskRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const clientRoutes = require("./routes/clientRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const { loginUser, logoutUser } = require("./controllers/userController");
const { setSocketIO } = require("./utils/socket");
dotenv.config({ path: __dirname + '/.env' });

connectedDB();

const app = express();
const server = http.createServer(app);
let SocketIOServer = null;
try {
  SocketIOServer = require("socket.io").Server;
} catch {
  console.warn("socket.io is not installed. Real-time attendance events are disabled.");
}

if (SocketIOServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  setSocketIO(io);

  io.on("connection", (socket) => {
    socket.emit("socket:connected", { id: socket.id });
  });
}

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/clients", clientRoutes);

// Alias endpoints requested for attendance workflow.
app.post("/api/login", loginUser);
app.post("/api/logout", authMiddleware, logoutUser);

app.get("/", (req, res) => {
  res.send("Brandslight CRM API Running");
});

const PORT = process.env.PORT || 4050;

server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
