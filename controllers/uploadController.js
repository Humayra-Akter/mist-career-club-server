const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "mist-career-club",
  },
});

const upload = multer({ storage: storage });

const uploadImage = async (req, res) => {
  try {
    const file = req.file;
    res.status(200).json({
      message: "Image uploaded successfully",
      fileUrl: file.path,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { upload, uploadImage };
