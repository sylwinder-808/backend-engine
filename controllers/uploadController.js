import cloudinary from "../lib/cloudinary";
import streamifier from "streamifier";

export const uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File tidak ada" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "uploads" },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    res.json({
      url: result.secure_url,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};