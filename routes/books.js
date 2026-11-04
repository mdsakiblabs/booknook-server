import express from "express";
import { ObjectId } from "mongodb";
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

// Get a single book by ID
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();

    const bookId = req.params.id;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book = await db.collection("books").findOne({
      _id: new ObjectId(bookId),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    console.error("Failed to fetch book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
});

// Add a new book
router.post("/", async (req, res) => {
  try {
    const db = getDB();

    const newBook = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await db.collection("books").insertOne(newBook);

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add book",
    });
  }
});

export default router;
