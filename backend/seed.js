import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/user.model.js";
import Message from "./src/models/message.model.js";
import dotenv from "dotenv";

dotenv.config();

const usersData = [
  { name: "Utkarsh", email: "utkarsh@example.com" },
  { name: "Harsh", email: "harsh@example.com" },
  { name: "Pratikshya", email: "pratikshya@example.com" },
  { name: "Aryan", email: "aryan@example.com" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to DB");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const createdUsers = [];
    for (const u of usersData) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create({
          ...u,
          password: hashedPassword,
          profilePicture: `https://ui-avatars.com/api/?name=${u.name}&background=random`
        });
        console.log(`Created user: ${u.name}`);
      } else {
        console.log(`User already exists: ${u.name}`);
      }
      createdUsers.push(existing);
    }

    // Add some realistic test messages
    const utkarsh = createdUsers.find(u => u.name === "Utkarsh");
    const harsh = createdUsers.find(u => u.name === "Harsh");
    const pratikshya = createdUsers.find(u => u.name === "Pratikshya");
    const aryan = createdUsers.find(u => u.name === "Aryan");
    
    if (utkarsh && harsh) {
      await Message.create({ senderId: harsh._id, receiverId: utkarsh._id, message: "Hey Utkarsh, is the new chat app ready?" });
      await Message.create({ senderId: utkarsh._id, receiverId: harsh._id, message: "Yes! Testing it out right now. It has web push notifications too!" });
      console.log("Messages created between Harsh and Utkarsh");
    }

    if (utkarsh && pratikshya) {
      await Message.create({ senderId: pratikshya._id, receiverId: utkarsh._id, message: "The UI looks amazing 😍" });
      await Message.create({ senderId: utkarsh._id, receiverId: pratikshya._id, message: "Thanks! Try sending a voice note." });
      console.log("Messages created between Pratikshya and Utkarsh");
    }

    if (utkarsh && aryan) {
      await Message.create({ senderId: aryan._id, receiverId: utkarsh._id, message: "Bro let's play valorant tonight" });
      console.log("Messages created between Aryan and Utkarsh");
    }

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
