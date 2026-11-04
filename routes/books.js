import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
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
router.get("/:id", verifyToken, async (req, res) => {
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
router.post("/", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const newBook = {
      ...req.body,
      addedBy: req.user.name,
      addedByEmail: req.user.email,
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

// Update a book
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const bookId = req.params.id;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const { _id, createdAt, addedBy, addedByEmail, ...updatedData } = req.body;

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided",
      });
    }

    const result = await db.collection("books").updateOne(
      {
        _id: new ObjectId(bookId),
        addedByEmail: req.user.email,
      },
      {
        $set: updatedData,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found or you are not the owner",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
    });
  } catch (error) {
    console.error("Failed to update book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
});

// Delete a book
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const bookId = req.params.id;

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const result = await db.collection("books").deleteOne({
      _id: new ObjectId(bookId),
      addedByEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found or you are not the owner",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
});

export default router;
