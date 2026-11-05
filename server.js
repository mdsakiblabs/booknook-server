import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/books", booksRouter);
app.use("/borrows", borrowsRouter);

app.get("/", (req, res) => {
  res.send("BookNook API is running!");
});

await connectDB();

app.listen(PORT, () => {
  console.log(`BookNook server running on port ${PORT}`);
});
