const { ObjectId } = require("mongodb");
const connectDB = require("../utils/db");

const getEvents = async (req, res) => {
  try {
    const db = await connectDB();
    const events = await db.collection("events").find({}).toArray();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events", error });
  }
};

const createEvent = async (req, res) => {
  try {
    const db = await connectDB();
    const event = req.body; // Expecting the event data in the request body
    const result = await db.collection("events").insertOne(event);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event", error });
  }
};

const updateEvent = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    const updatedData = req.body;
    const result = await db
      .collection("events")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to update event", error });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    const result = await db
      .collection("events")
      .deleteOne({ _id: new ObjectId(id) });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error });
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
