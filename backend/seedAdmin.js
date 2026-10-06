// Seeds (or resets) the admin login. Run: npm run seed:admin
// Upserts by email, so re-running just resets the password.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// Local-only guard: refuse to touch any non-localhost database.
const isLocalDb = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "");
if (!isLocalDb || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: admin seed runs only against a localhost MongoDB.");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      { $set: { name: "Admin", email: ADMIN_EMAIL, password, role: "admin", isActive: true } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log(`Admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
