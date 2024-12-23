const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);
app.get("/", (req, res) => {
  res.send("Running from server");
});
// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});