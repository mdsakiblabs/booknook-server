import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// Get all books
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const books = await db
      .collection("books")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    console.error("Failed to fetch books:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

export default router;
