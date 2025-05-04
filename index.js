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
    const panelCollection = client.db("mist-career-club").collection("panel");
    const partnerCollection = client
      .db("mist-career-club")
      .collection("partner");

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

    // Post Event
    app.post(
      "/event",
      upload.fields([
        { name: "mainImage", maxCount: 1 },
        { name: "images", maxCount: 100 },
      ]),
      async (req, res) => {
        try {
          const { title, date, description } = req.body;
          const mainImage = req.files["mainImage"]
            ? req.files["mainImage"][0].path
            : null; // Handle main image separately
          const images = req.files["images"]
            ? req.files["images"].map((file) => file.path)
            : []; // Handle multiple images

          const event = { title, date, description, mainImage, images };
          const result = await eventCollection.insertOne(event);

          if (result?.insertedId) {
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
      }
    );

    // Update an Event
    app.put(
      "/event/:id",
      upload.fields([
        { name: "mainImage", maxCount: 1 },
        { name: "images", maxCount: 100 },
      ]),
      async (req, res) => {
        try {
          const { id } = req.params;
          const { title, date, description, existingImages } = req.body;

          // Parse existing images if provided as a JSON string
          const existingImagesArray = existingImages
            ? JSON.parse(existingImages)
            : [];

          // Fetch the event from the database
          const event = await eventCollection.findOne({
            _id: new ObjectId(id),
          });
          if (!event) {
            return res.status(404).json({ message: "Event not found" });
          }

          // Handle mainImage update
          let updatedMainImage = event.mainImage;
          if (req.files["mainImage"]) {
            const newMainImage = req.files["mainImage"][0].path;

            // Delete old mainImage from Cloudinary
            if (event.mainImage) {
              const publicId = event.mainImage.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(
                `mist-career-club/events/${publicId}`
              );
            }

            updatedMainImage = newMainImage;
          }

          // Handle additional images update
          const newImages = req.files["images"]
            ? req.files["images"].map((file) => file.path)
            : [];

          // Identify images to delete
          const imagesToDelete = event.images.filter(
            (img) => !existingImagesArray.includes(img)
          );

          // Remove old images from Cloudinary
          for (const image of imagesToDelete) {
            const publicId = image.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(
              `mist-career-club/events/${publicId}`
            );
          }

          // Combine existing and new images
          const updatedImages = [...existingImagesArray, ...newImages];

          // Prepare update object
          const updateFields = {
            title,
            date,
            description,
            mainImage: updatedMainImage,
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
      }
    );

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

    // Post panel
    app.post("/panel", upload.array("images", 9), async (req, res) => {
      try {
        const panelData = JSON.parse(req.body.panel);
        const images = req.files;

        if (!panelData || panelData.length !== 9) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Map data to store in DB
        const panelMembers = panelData.map((member, index) => ({
          name: member.name,
          department: member.department,
          segment: member.segment,
          term: member.term,
          year: member.year,
          image: images[index] ? images[index].path : null,
        }));

        // Insert into MongoDB
        const result = await panelCollection.insertMany(panelMembers);

        if (result.insertedCount > 0) {
          res.status(201).json({
            message: "Panel members added successfully",
            panelIds: result.insertedIds,
          });
        } else {
          res.status(500).json({ message: "Failed to add panel members" });
        }
      } catch (error) {
        console.error("Error adding panel members:", error);
        res
          .status(500)
          .json({ message: "An error occurred while adding panel members" });
      }
    });

    // Update panel
    app.put(
      "/panel/:id",
      upload.fields([{ name: "image", maxCount: 1 }]), // Use maxCount: 1
      async (req, res) => {
        try {
          const { id } = req.params;
          const { name, department, segment } = req.body;

          const panelMember = await panelCollection.findOne({
            _id: new ObjectId(id),
          });

          if (!panelMember) {
            return res.status(404).json({ message: "Panel member not found" });
          }

          let updatedImage = panelMember.image;
          if (req.files["image"] && req.files["image"][0]) {
            const newImage = req.files["image"][0].path;

            // Delete old image
            if (panelMember.image) {
              const publicId = panelMember.image.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(
                `mist-career-club/panel/${publicId}`
              );
            }

            updatedImage = newImage;
          }

          const updateFields = {
            name,
            department,
            segment,
            image: updatedImage,
          };

          const result = await panelCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
          );

          if (result.matchedCount > 0) {
            res.json({ message: "Panel member updated successfully" });
          } else {
            res.status(404).json({ message: "Panel member not found" });
          }
        } catch (error) {
          console.error("Error updating panel member:", error);
          res.status(500).json({ message: "Failed to update panel member" });
        }
      }
    );

    // Fetch all panel
    app.get("/panel", async (req, res) => {
      try {
        const events = await panelCollection.find({}).toArray();
        res.json(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Failed to fetch events" });
      }
    });

    // Fetch all Partners
    app.post("/partner", upload.single("image"), async (req, res) => {
      try {
        const { name, details } = req.body;
        const imagePath = req.file?.path || "";

        const partner = {
          name,
          details,
          image: imagePath,
        };

        const result = await partnerCollection.insertOne(partner);
        if (result.insertedCount === 1 || result.acknowledged) {
          res.status(201).json({ message: "Partner added successfully" });
        } else {
          res.status(500).json({ message: "Failed to add partner" });
        }
      } catch (error) {
        console.error("Error adding partner:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //partner get
    app.get("/partner", async (req, res) => {
      const query = {};
      const cursor = partnerCollection.find(query);
      const partner = await cursor.toArray();
      res.send(partner);
    });

    app.put("/partner/:id", upload.single("image"), async (req, res) => {
      try {
        const { id } = req.params;
        const { name, details } = req.body;

        const existingPartner = await partnerCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!existingPartner) {
          return res.status(404).json({ message: "Partner not found" });
        }

        let updatedImage = existingPartner.image;

        if (req.file) {
          const newImage = req.file.path;

          // Delete old image from Cloudinary
          if (existingPartner.image) {
            const publicId = existingPartner.image
              .split("/")
              .pop()
              .split(".")[0];
            await cloudinary.uploader.destroy(
              `mist-career-club/partners/${publicId}`
            );
          }

          updatedImage = newImage;
        }

        const updatedFields = {
          name,
          details,
          image: updatedImage,
        };

        const result = await partnerCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedFields }
        );

        if (result.matchedCount > 0) {
          res.json({ message: "Partner updated successfully" });
        } else {
          res.status(404).json({ message: "Partner not found" });
        }
      } catch (error) {
        console.error("Error updating partner:", error);
        res.status(500).json({ message: "Failed to update partner" });
      }
    });

    app.delete("/partner/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const partner = await partnerCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!partner) {
          return res.status(404).json({ message: "Partner not found" });
        }

        // Delete image from Cloudinary
        if (partner.image) {
          const publicId = partner.image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(
            `mist-career-club/partners/${publicId}`
          );
        }

        const result = await partnerCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount > 0) {
          res.json({ message: "Partner deleted successfully" });
        } else {
          res.status(404).json({ message: "Partner not found" });
        }
      } catch (error) {
        console.error("Error deleting partner:", error);
        res.status(500).json({ message: "Failed to delete partner" });
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
