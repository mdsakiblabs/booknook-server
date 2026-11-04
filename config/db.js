import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);

let db;

export const connectDB = async () => {
  try {
    await client.connect();

    db = client.db("booknook");

    await db.collection("borrows").createIndexes([
      {
        key: { bookId: 1, userEmail: 1 },
        unique: true,
        name: "unique_book_user_borrow",
        partialFilterExpression: {
          bookId: { $exists: true },
          userEmail: { $exists: true },
        },
      },
    ]);

    console.log("MongoDB connected successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export const getDB = () => db;
export const getClient = () => client;
