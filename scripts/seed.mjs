// Run with: npm run seed
// Populates a demo company, location, staff team, and a few work orders
// so you can log in and see the app the way the mockup looked.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

import Company from "../models/Company.js";
import Location from "../models/Location.js";
import User from "../models/User.js";
import Job from "../models/Job.js";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected. Clearing existing demo data...");

  await Promise.all([
    Company.deleteMany({}),
    Location.deleteMany({}),
    User.deleteMany({}),
    Job.deleteMany({}),
  ]);

  const company = await Company.create({ name: "Ferrow Facilities Group" });

  const location = await Location.create({
    companyId: company._id,
    name: "Lekki Corporate Plaza",
    address: "12 Admiralty Way, Lekki",
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const manager = await User.create({
    companyId: company._id,
    locationId: location._id,
    name: "Adaeze Manager",
    email: "manager@ferrow.co",
    passwordHash,
    role: "manager",
  });

  const cleaners = await User.insertMany([
    {
      companyId: company._id,
      locationId: location._id,
      name: "Tunde Adisa",
      email: "tunde.adisa@ferrow.co",
      passwordHash,
      role: "staff",
      staffType: "Cleaning",
      shiftStatus: "on",
      shiftSince: new Date(),
    },
    {
      companyId: company._id,
      locationId: location._id,
      name: "Ngozi Eze",
      email: "ngozi.eze@ferrow.co",
      passwordHash,
      role: "staff",
      staffType: "Cleaning",
      shiftStatus: "on",
      shiftSince: new Date(),
    },
    {
      companyId: company._id,
      locationId: location._id,
      name: "Femi Bello",
      email: "femi.bello@ferrow.co",
      passwordHash,
      role: "staff",
      staffType: "Cleaning",
      shiftStatus: "off",
    },
  ]);

  await User.insertMany([
    {
      companyId: company._id,
      locationId: location._id,
      name: "Bayo Salako",
      email: "bayo.salako@ferrow.co",
      passwordHash,
      role: "staff",
      staffType: "Maintenance",
      shiftStatus: "on",
      shiftSince: new Date(),
    },
    {
      companyId: company._id,
      locationId: location._id,
      name: "Chidi Nwosu",
      email: "chidi.nwosu@ferrow.co",
      passwordHash,
      role: "staff",
      staffType: "Security",
      shiftStatus: "on",
      shiftSince: new Date(),
    },
  ]);

  await Job.insertMany([
    {
      companyId: company._id,
      locationId: location._id,
      title: "AC unit #3 — compressor noise",
      area: "Roof",
      staffType: "Maintenance",
      status: "pending",
      priority: "high",
      handoffNote:
        "Checked freon, seems fine. Noise is mechanical, not gas. Might need bearing replaced.",
      leftByUserId: null,
      leftAt: new Date(),
    },
    {
      companyId: company._id,
      locationId: location._id,
      title: "Fire extinguisher inspection — Floor 3",
      area: "Floor 3",
      staffType: "Cleaning",
      status: "open",
      priority: "routine",
    },
    {
      companyId: company._id,
      locationId: location._id,
      title: "Leaking pipe under east stairwell",
      area: "East Stairwell",
      staffType: "Maintenance",
      status: "in_progress",
      priority: "high",
      handoffNote: "Shut water valve to that section. Bucket in place. Plumber needed.",
      leftAt: new Date(),
    },
  ]);

  console.log("Seed complete.");
  console.log("Manager login:  manager@ferrow.co / password123");
  console.log("Staff login:    tunde.adisa@ferrow.co / password123");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
