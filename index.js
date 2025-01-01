const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb"); // Import ObjectId for identifying documents
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mist-career-club/events",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const upload = multer({ storage });

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const eventCollection = client.db("mist-career-club").collection("event");

    // Fetch all events
    app.get("/event", async (req, res) => {
      try {
        const events = await eventCollection.find({}).toArray();
        res.json(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Failed to fetch events" });
      }
    });

    // Create a new event with multiple images
    app.post("/event", upload.array("images", 10), async (req, res) => {
      try {
        const { title, date, description } = req.body;
        const images = req.files.map((file) => file.path); // Array of image URLs

        const event = { title, date, description, images };
        const result = await eventCollection.insertOne(event);

        if (result.insertedId) {
          res.status(201).json({
            message: "Event added successfully",
            eventId: result.insertedId,
          });
        } else {
          res.status(500).json({ message: "Failed to add event" });
        }
      } catch (error) {
        console.error("Error creating event:", error);
        res
          .status(500)
          .json({ message: "An error occurred while creating the event" });
      }
    });

    app.put("/event/:id", upload.array("images", 10), async (req, res) => {
      try {
        const { id } = req.params;
        const { title, date, description, existingImages } = req.body;

        // Parse the existing images (if provided as a JSON string)
        const existingImagesArray = existingImages
          ? JSON.parse(existingImages)
          : [];

        // Collect new image URLs (if any)
        const newImages = req.files ? req.files.map((file) => file.path) : [];

        // Identify images to delete
        const event = await eventCollection.findOne({ _id: new ObjectId(id) });
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        const imagesToDelete = event.images.filter(
          (img) => !existingImagesArray.includes(img)
        );

        // Remove images from Cloudinary
        for (const image of imagesToDelete) {
          const publicId = image.split("/").pop().split(".")[0]; // Extract Cloudinary public ID
          await cloudinary.uploader.destroy(
            `mist-career-club/events/${publicId}`
          );
        }

        // Combine existing and new images
        const updatedImages = [...existingImagesArray, ...newImages];

        const updateFields = {
          title,
          date,
          description,
          images: updatedImages,
        };

        const result = await eventCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        if (result.matchedCount > 0) {
          res.json({ message: "Event updated successfully" });
        } else {
          res.status(404).json({ message: "Event not found" });
        }
      } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Failed to update event" });
      }
    });

    // Delete an event by ID
    app.delete("/event/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await eventCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount > 0) {
          res.json({ message: "Event deleted successfully" });
        } else {
          res.status(404).json({ message: "Event not found" });
        }
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Failed to delete event" });
      }
    });

    // Root route
    app.get("/", (req, res) => {
      res.send("Welcome to the MIST Career Club backend!");
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);
