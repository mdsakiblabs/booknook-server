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

// Get all borrowed books
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const { userEmail } = req.query;

    const borrows = await db
      .collection("borrows")
      .find(userEmail ? { userEmail } : {})
      .sort({ borrowDate: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: borrows.length,
      borrows,
    });
  } catch (error) {
    console.error("Failed to fetch borrows:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch borrowed books",
    });
  }
});

// Return a borrowed book
router.delete("/:id", async (req, res) => {
  const db = getDB();
  const client = getClient();

  const borrowId = req.params.id;

  if (!ObjectId.isValid(borrowId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid borrow ID",
    });
  }

  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const borrowsCollection = db.collection("borrows");
      const booksCollection = db.collection("books");

      // Find borrow record
      const borrow = await borrowsCollection.findOne(
        { _id: new ObjectId(borrowId) },
        { session },
      );

      if (!borrow) {
        throw Object.assign(new Error("Borrow record not found"), {
          statusCode: 404,
        });
      }

      // Increase available copies
      const updateResult = await booksCollection.updateOne(
        {
          _id: new ObjectId(borrow.bookId),
          $expr: {
            $lt: ["$availableCopies", "$totalCopies"],
          },
        },
        {
          $inc: { availableCopies: 1 },
        },
        { session },
      );

      if (updateResult.matchedCount === 0) {
        throw Object.assign(
          new Error("Book not found or stock limit reached"),
          {
            statusCode: 409,
          },
        );
      }

      // Delete borrow record
      await borrowsCollection.deleteOne(
        { _id: new ObjectId(borrowId) },
        { session },
      );
    });

    res.status(200).json({
      success: true,
      message: "Book returned successfully",
    });
  } catch (error) {
    console.error("Failed to return book:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to return book",
    });
  } finally {
    await session.endSession();
  }
});

export default router;
