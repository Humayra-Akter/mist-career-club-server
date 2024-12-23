const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  name: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
});

const Event = mongoose.model("Event", EventSchema);

module.exports = Event;
