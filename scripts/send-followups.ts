// scripts/send-followups.ts
//
// Cron: sends due lead follow-up messages.
// Run daily, e.g.: 0 9 * * * cd /path/to/platform && npx tsx scripts/send-followups.ts
import "dotenv/config";
import { sendDueFollowUps } from "@/server/leads/followup-sender";

async function main() {
  const result = await sendDueFollowUps();
  console.log(
    `followups: attempted=${result.attempted} sent=${result.sent} failed=${result.failed}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("followup cron failed:", err);
  process.exit(1);
});
