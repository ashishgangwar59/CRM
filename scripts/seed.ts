import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://e2e_website:H26fzSu4IQTv7JmL@cluster0.c6zdint.mongodb.net/crm?retryWrites=true&w=majority&appName=Cluster0";

// Define simplified User schema just for seeding
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, default: "USER" },
    lastPasswordChange: { type: Date, default: Date.now },
    requirePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    existingAdmin.password = hashedPassword;
    existingAdmin.role = 'ADMIN';
    await existingAdmin.save();
    console.log(`Updated existing admin user: ${email}`);
  } else {
    await User.create({
      email,
      password: hashedPassword,
      role: 'ADMIN',
    });
    console.log(`Created auto-seeded default user: ${email}`);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Database seeded successfully!");
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
  });
