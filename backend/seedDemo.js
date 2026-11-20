// One command for all demo data (localhost MongoDB only — each step refuses
// to touch any other database):
//
//   npm run seed:demo              load / refresh everything
//   npm run seed:demo -- --remove  remove all demo data (real records untouched)
//
// Steps: client-visit check-ins → Super Admin dashboard (revenue, renewals,
// balance due, expenses, deliverables) → telecalling (telecallers, leads,
// calls, meetings). They share one demo sales user (sales.demo@example.com).
const path = require("path");
const { spawnSync } = require("child_process");

const STEPS = ["seedSampleVisits.js", "seedSampleDashboard.js", "seedSampleTelecalling.js"];
const remove = process.argv.includes("--remove");

for (const script of remove ? [...STEPS].reverse() : STEPS) {
  console.log(`\n▶ ${script}${remove ? " --remove" : ""}`);
  const run = spawnSync(process.execPath, [path.join(__dirname, script), ...(remove ? ["--remove"] : [])], { stdio: "inherit" });
  if (run.status !== 0) {
    console.error(`✖ ${script} failed — stopping.`);
    process.exit(run.status || 1);
  }
}

console.log(remove ? "\n✓ All demo data removed." : `
✓ Demo data ready. Logins:
   Super admin   admin@gmail.com / admin123 (if seeded with npm run seed:admin)
   Sales         sales.demo@example.com / sales123
   Telecaller    telecaller.demo@example.com / tele123
   Telecaller    telecaller2.demo@example.com / tele123`);
