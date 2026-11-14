import "server-only";
import { connectDB } from "@/lib/mongodb";
import Company from "@/models/Company";

export default async function companyExist() {
  try {
    await connectDB();
    const company = await Company.findOne();
    return !!company;
  } catch (error) {
    console.warn("companyExist check skipped because MongoDB is unavailable:", error.message);
    return false;
  }
}