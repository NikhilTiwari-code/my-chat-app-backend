import { Request, Response } from "express";
import streamifier from "streamifier";
import { cloudinary } from "../../config/cloudinary";

const uploadToCloudinary = (buffer: Buffer, folder = "whatsapp-clone") =>
  new Promise<{ url: string; bytes: number; format?: string; resourceType: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Upload failed"));
        }
        resolve({
          url: result.secure_url,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });

export const uploadMedia = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  const result = await uploadToCloudinary(req.file.buffer);
  return res.status(201).json({
    url: result.url,
    bytes: result.bytes,
    format: result.format,
    resourceType: result.resourceType,
    originalName: req.file.originalname
  });
};
