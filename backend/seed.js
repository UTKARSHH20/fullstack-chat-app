import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/user.model.js";
import Message from "./src/models/message.model.js";
import dotenv from "dotenv";

dotenv.config();

const RESET = process.argv.includes("--reset");

const usersData = [
  { name: "Utkarsh", email: "utkarsh@example.com" },
  { name: "Harsh", email: "harsh@example.com" },
  { name: "Pratikshya", email: "pratikshya@example.com" },
  { name: "Aryan", email: "aryan@example.com" },
];

async function upsertUser(userData, hashedPassword) {
  const existing = await User.findOne({ email: userData.email });
  if (existing) {
    console.log(`User already exists: ${userData.name}`);
    return existing;
  }
  const created = await User.create({
    ...userData,
    password: hashedPassword,
    profilePicture: `https://ui-avatars.com/api/?name=${userData.name}&background=random`,
  });
  console.log(`Created user: ${userData.name}`);
  return created;
}

async function upsertMessage(senderId, receiverId, message) {
  const result = await Message.findOneAndUpdate(
    { senderId, receiverId, message },
    { $setOnInsert: { senderId, receiverId, message, seeded: true } },
    { upsert: true, new: true, lean: true }
  );
  return result;
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to DB");

    if (RESET) {
      const { deletedCount } = await Message.deleteMany({ seeded: true });
      console.log(`Reset: deleted ${deletedCount} seeded message(s)`);
    }

    const hashedPassword = await bcrypt.hash("password123", 10);

    const createdUsers = await Promise.all(
      usersData.map((u) => upsertUser(u, hashedPassword))
    );

    // Resolve by email (stable identifier) to avoid name mismatch on existing users
    const byEmail = Object.fromEntries(createdUsers.map((u) => [u.email, u]));
    const utkarsh = byEmail["utkarsh@example.com"];
    const harsh = byEmail["harsh@example.com"];
    const pratikshya = byEmail["pratikshya@example.com"];
    const aryan = byEmail["aryan@example.com"];

    const seedMessages = [
      { from: harsh, to: utkarsh, text: "Hey Utkarsh, is the new chat app ready?" },
      { from: utkarsh, to: harsh, text: "Yes! Testing it out right now. It has web push notifications too!" },
      { from: pratikshya, to: utkarsh, text: "The UI looks amazing 😍" },
      { from: utkarsh, to: pratikshya, text: "Thanks! Try sending a voice note." },
      { from: aryan, to: utkarsh, text: "Bro let's play valorant tonight" },
    ];

    let created = 0;
    let skipped = 0;

    for (const { from, to, text } of seedMessages) {
      if (!from || !to) continue;
      const doc = await upsertMessage(from._id, to._id, text);
      // findOneAndUpdate with upsert returns the doc; check if it was just inserted
      // by comparing createdAt ≈ now (within 2 s) when not resetting
      const isNew = Date.now() - new Date(doc.createdAt).getTime() < 2000;
      if (isNew || RESET) {
        created++;
      } else {
        skipped++;
      }
    }

    console.log(`Messages — created: ${created}, skipped (already existed): ${skipped}`);
    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();