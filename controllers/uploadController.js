const multer = require("multer");
const cloudinary = require("cloudinary");
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = multer.memoryStorage(); // Store images in memory

const upload = multer({ storage });

const uploadImage = async (req, res) => {
  try {
    const file = req.file;
    const result = await cloudinary.uploader.upload_stream(
      { public_id: uuidv4() },
      (error, result) => {
        if (error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(200).json({
            message: "Image uploaded successfully",
            fileUrl: result.secure_url,
          });
        }
      }
    );
    file.stream.pipe(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { upload, uploadImage };
