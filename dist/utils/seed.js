"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
async function run() {
    await (0, db_1.connectDB)();
    const accounts = [
        {
            name: "Sujait",
            email: process.env.SEED_SUJAIT_EMAIL,
            password: process.env.SEED_SUJAIT_PASSWORD,
            role: "owner",
        },
        {
            name: "Adnan",
            email: process.env.SEED_ADNAN_EMAIL,
            password: process.env.SEED_ADNAN_PASSWORD,
            role: "shop",
        },
    ];
    for (const acc of accounts) {
        const existing = await User_1.default.findOne({ email: acc.email.toLowerCase() });
        if (existing) {
            console.log(`Skipping ${acc.email}, already exists`);
            continue;
        }
        const hashed = await bcryptjs_1.default.hash(acc.password, 10);
        await User_1.default.create({ ...acc, email: acc.email.toLowerCase(), password: hashed });
        console.log(`Created user: ${acc.name} (${acc.email}) [${acc.role}]`);
    }
    await mongoose_1.default.disconnect();
    console.log("Seeding complete.");
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
