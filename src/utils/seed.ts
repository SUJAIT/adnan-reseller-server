import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import User from "../models/User";
import mongoose from "mongoose";

async function run() {
  await connectDB();

  const accounts = [
    {
      name: "Sujait",
      email: process.env.SEED_SUJAIT_EMAIL!,
      password: process.env.SEED_SUJAIT_PASSWORD!,
      role: "owner" as const,
    },
 
 
    {
      name: "Adnan",
      email: process.env.SEED_ADNAN_EMAIL!,
      password: process.env.SEED_ADNAN_PASSWORD!,
      role: "shop" as const,
    },
  ];

  for (const acc of accounts) {
    const existing = await User.findOne({ email: acc.email.toLowerCase() });
    if (existing) {
      console.log(`Skipping ${acc.email}, already exists`);
      continue;
    }
    const hashed = await bcrypt.hash(acc.password, 10);
    await User.create({ ...acc, email: acc.email.toLowerCase(), password: hashed });
    console.log(`Created user: ${acc.name} (${acc.email}) [${acc.role}]`);
  }

  await mongoose.disconnect();
  console.log("Seeding complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
