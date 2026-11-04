import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("BookNook API is running!");
});

// Start server
await connectDB();

app.listen(PORT, () => {
  console.log(`BookNook server running on port ${PORT}`);
});
