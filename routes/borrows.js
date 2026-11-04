import express from "express";
import { ObjectId } from "mongodb";
import { getDB, getClient } from "../config/db.js";

const router = express.Router();

// Borrow a book
router.post("/", async (req, res) => {
  const db = getDB();
  const client = getClient();

  const { bookId, userName, userEmail, returnDate } = req.body;

  // Validate input
  if (!bookId || !userName || !userEmail || !returnDate) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (!ObjectId.isValid(bookId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid book ID",
    });
  }

  const parsedReturnDate = new Date(returnDate);

  if (isNaN(parsedReturnDate.getTime()) || parsedReturnDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid future return date",
    });
  }

  const session = client.startSession();

  try {
    let borrowResult;

    await session.withTransaction(async () => {
      const booksCollection = db.collection("books");
      const borrowsCollection = db.collection("borrows");

      const book = await booksCollection.findOne(
        { _id: new ObjectId(bookId) },
        { session },
      );

      if (!book) {
        throw Object.assign(new Error("Book not found"), {
          statusCode: 404,
        });
      }

      // Check duplicate borrow
      const existingBorrow = await borrowsCollection.findOne(
        { bookId, userEmail },
        { session },
      );

      if (existingBorrow) {
        throw Object.assign(new Error("You have already borrowed this book"), {
          statusCode: 409,
        });
      }

      // Decrease available copies
      const updateResult = await booksCollection.updateOne(
        {
          _id: new ObjectId(bookId),
          availableCopies: { $gt: 0 },
        },
        {
          $inc: { availableCopies: -1 },
        },
        { session },
      );

      if (updateResult.matchedCount === 0) {
        throw Object.assign(new Error("Book is not available"), {
          statusCode: 409,
        });
      }

      // Create borrow record
      const newBorrow = {
        bookId,
        bookTitle: book.title,
        bookImage: book.image,
        userName,
        userEmail,
        borrowDate: new Date(),
        returnDate: parsedReturnDate,
      };

      const result = await borrowsCollection.insertOne(newBorrow, {
        session,
      });

      borrowResult = {
        ...newBorrow,
        _id: result.insertedId,
      };
    });

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully",
      borrow: borrowResult,
    });
  } catch (error) {
    console.error("Failed to borrow book:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to borrow book",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
