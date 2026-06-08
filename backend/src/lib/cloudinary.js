import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
config();

const REQUIRED_CLOUDINARY_VARS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
for (const envVar of REQUIRED_CLOUDINARY_VARS) {
    if (!process.env[envVar]) {
        console.warn(`WARNING: Environment variable ${envVar} is missing. Cloudinary uploads will fail.`);
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
