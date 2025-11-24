/**
 * Reset message count for a user (useful during development/testing)
 * Usage: pnpm run reset-messages
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);

async function resetMessageCount() {
  try {
    console.log("🔄 Resetting message count...");
    
    // Delete messages from the last 24 hours to reset the count
    const result = await client`
      DELETE FROM "Message_v2"
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    `;
    
    console.log(`✅ Deleted ${result.count} messages from the last 24 hours`);
    console.log("✅ Message count reset! You can now send messages again.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting message count:", error);
    process.exit(1);
  }
}

resetMessageCount();
