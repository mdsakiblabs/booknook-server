import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
const router = express.Router();

// Get all books
router.get(
  "/",
  (req, res, next) => {
    if (req.query.mine === "true") {
      return verifyToken(req, res, next);
    }

    next();
  },
  async (req, res) => {
    try {
      const db = getDB();
      const isMyBooksRequest = req.query.mine === "true";

      const filter = isMyBooksRequest ? { addedByEmail: req.user.email } : {};

      const books = await db
        .collection("books")
        .find(filter, {
          projection: { addedByEmail: 0 },
        })
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
  },
);

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

// Add a new book
router.post("/", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const {
      title,
      subtitle,
      author,
      category,
      image,
      description,
      isbn,
      publisher,
      publishedYear,
      pages,
      language,
      format,
      tags,
      featured,
      totalCopies,
    } = req.body;

    // Validate required fields
    if (
      !title?.trim() ||
      !author?.trim() ||
      !category?.trim() ||
      !Number.isInteger(totalCopies) ||
      totalCopies < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid book information",
      });
    }

    // Validate optional numeric fields
    if (
      (publishedYear !== undefined &&
        (!Number.isInteger(publishedYear) || publishedYear < 1)) ||
      (pages !== undefined && (!Number.isInteger(pages) || pages < 1))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid published year or page count",
      });
    }

    // Validate tags
    if (
      tags !== undefined &&
      (!Array.isArray(tags) ||
        !tags.every((tag) => typeof tag === "string" && tag.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Tags must be an array of valid strings",
      });
    }

    // Validate featured
    if (featured !== undefined && typeof featured !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Featured must be a boolean value",
      });
    }

    const newBook = {
      title: title.trim(),
      subtitle: subtitle?.trim() || "",
      author: author.trim(),
      category: category.trim(),
      image: image?.trim() || "",
      description: description?.trim() || "",

      isbn: isbn?.trim() || "",
      publisher: publisher?.trim() || "",
      publishedYear: publishedYear || null,
      pages: pages || null,
      language: language?.trim() || "",
      format: format?.trim() || "",
      tags: tags?.map((tag) => tag.trim()) || [],
      featured: featured ?? false,

      totalCopies,
      availableCopies: totalCopies,

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

    const allowedFields = [
      "title",
      "subtitle",
      "author",
      "category",
      "image",
      "description",
      "isbn",
      "publisher",
      "publishedYear",
      "pages",
      "language",
      "format",
      "tags",
      "featured",
    ];

    const updatedData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updatedData[field] = req.body[field];
      }
    }

    // Validate string fields
    const stringFields = [
      "title",
      "subtitle",
      "author",
      "category",
      "image",
      "description",
      "isbn",
      "publisher",
      "language",
      "format",
    ];

    for (const field of stringFields) {
      if (updatedData[field] !== undefined) {
        if (
          typeof updatedData[field] !== "string" ||
          (["title", "author", "category"].includes(field) &&
            !updatedData[field].trim())
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid value for ${field}`,
          });
        }

        updatedData[field] = updatedData[field].trim();
      }
    }

    // Validate numeric fields
    for (const field of ["publishedYear", "pages"]) {
      if (
        updatedData[field] !== undefined &&
        updatedData[field] !== null &&
        (!Number.isInteger(updatedData[field]) || updatedData[field] < 1)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${field}`,
        });
      }
    }

    // Validate tags
    if (updatedData.tags !== undefined) {
      if (
        !Array.isArray(updatedData.tags) ||
        !updatedData.tags.every((tag) => typeof tag === "string" && tag.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Tags must be an array of valid strings",
        });
      }

      updatedData.tags = updatedData.tags.map((tag) => tag.trim());
    }

    // Validate featured
    if (
      updatedData.featured !== undefined &&
      typeof updatedData.featured !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Featured must be a boolean value",
      });
    }

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

    const activeBorrow = await db.collection("borrows").findOne({
      bookId: bookId,
    });

    if (activeBorrow) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a book with active borrows",
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
