import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment");
}

await mongoose.connect(uri);

try {
  const users = mongoose.connection.collection("users");
  const legacyCount = await users.countDocuments({ locationIds: { $exists: true } });
  const multiLocationCount = await users.countDocuments({
    $expr: {
      $gt: [
        {
          $size: {
            $cond: [{ $isArray: "$locationIds" }, "$locationIds", []],
          },
        },
        1,
      ],
    },
  });
  console.info(`Users with legacy locationIds: ${legacyCount}`);
  console.info(`Users with multiple locations (first will be kept): ${multiLocationCount}`);

  if (!process.argv.includes("--apply")) {
    console.info("Dry run only. Add --apply to migrate and remove the old locationIds arrays.");
  } else {
    const result = await users.updateMany(
      { locationIds: { $exists: true } },
      [
        {
          $set: {
            locationId: {
              $ifNull: [
                "$locationId",
                {
                  $arrayElemAt: [
                    { $cond: [{ $isArray: "$locationIds" }, "$locationIds", []] },
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $unset: "locationIds" },
      ],
    );
    console.info(`Migrated ${result.modifiedCount} user records.`);
  }
} finally {
  await mongoose.disconnect();
}
