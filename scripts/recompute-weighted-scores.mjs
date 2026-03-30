import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("需要提供 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN");
  process.exit(1);
}

const db = createClient({ url, authToken });

const supervisorWhere = `
  performanceStars IS NOT NULL
  AND comprehensiveStars IS NOT NULL
  AND learningStars IS NOT NULL
  AND adaptabilityStars IS NOT NULL
  AND candidStars IS NOT NULL
  AND progressStars IS NOT NULL
  AND altruismStars IS NOT NULL
  AND rootStars IS NOT NULL
`;

const weightedExpression = `
  ROUND(
    performanceStars * 0.5
    + ((comprehensiveStars + learningStars + adaptabilityStars) / 3.0) * 0.3
    + ((candidStars + progressStars + altruismStars + rootStars) / 4.0) * 0.2,
    1
  )
`;

async function countMismatches(tableName) {
  const result = await db.execute(`
    SELECT COUNT(*) AS count
    FROM ${tableName}
    WHERE ${supervisorWhere}
      AND (weightedScore IS NULL OR weightedScore != ${weightedExpression})
  `);

  return Number(result.rows[0]?.count || 0);
}

async function updateTable(tableName) {
  await db.execute(`
    UPDATE ${tableName}
    SET weightedScore = ${weightedExpression}
    WHERE ${supervisorWhere}
  `);
}

async function main() {
  const beforeSupervisor = await countMismatches("SupervisorEval");
  const beforeLeader = await countMismatches("LeaderFinalReview");

  console.log(`SupervisorEval 待修正: ${beforeSupervisor}`);
  console.log(`LeaderFinalReview 待修正: ${beforeLeader}`);

  await updateTable("SupervisorEval");
  await updateTable("LeaderFinalReview");

  const afterSupervisor = await countMismatches("SupervisorEval");
  const afterLeader = await countMismatches("LeaderFinalReview");

  console.log(`SupervisorEval 剩余偏差: ${afterSupervisor}`);
  console.log(`LeaderFinalReview 剩余偏差: ${afterLeader}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
