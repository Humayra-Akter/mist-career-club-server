const express = require("express");
const { upload, uploadImage } = require("../controllers/uploadController");

const router = express.Router();

router.post("/", upload.single("image"), uploadImage);

module.exports = router;
