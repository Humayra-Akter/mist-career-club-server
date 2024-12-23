const express = require("express");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const router = express.Router();

router.get("/", getEvents); // Get all events
router.post("/", createEvent); // Add a new event
router.put("/:id", updateEvent); // Update an event
router.delete("/:id", deleteEvent); // Delete an event

module.exports = router;
