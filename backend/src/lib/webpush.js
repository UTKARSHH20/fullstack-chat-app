import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:test@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default webpush;
