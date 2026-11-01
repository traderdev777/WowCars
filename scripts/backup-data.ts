/**
 * WowCars — Pre-Migration Backup and Rollback Recovery Utility
 * Creates byte-verified timestamped backups of persistent data and provides instant rollback.
 *
 * Usage:
 *   # Create a pre-migration backup:
 *   npx tsx scripts/backup-data.ts
 *
 *   # Restore from a backup (rollback):
 *   npx tsx scripts/backup-data.ts --restore data/backups/wowcars_db_backup_20261028_120000.json
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIR, "wowcars_db.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function sha256(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function createBackup() {
  console.log(`\n================================================================================`);
  console.log(`  WowCars Pre-Migration Backup Utility`);
  console.log(`================================================================================\n`);

  if (!fs.existsSync(DB_FILE_PATH)) {
    console.error(`❌ Source database file not found at: ${DB_FILE_PATH}`);
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(DB_FILE_PATH, "utf8");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(sourceContent);
  } catch (err) {
    console.error(`❌ Source database file contains invalid JSON:`, err);
    process.exit(1);
  }

  const sourceHash = sha256(sourceContent);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const backupFileName = `wowcars_db_backup_${timestamp}.json`;

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupFilePath = path.join(BACKUP_DIR, backupFileName);
  fs.writeFileSync(backupFilePath, sourceContent, "utf8");

  const backupContent = fs.readFileSync(backupFilePath, "utf8");
  const backupHash = sha256(backupContent);

  if (sourceHash !== backupHash) {
    console.error(`❌ Backup verification failed: Hash mismatch between source and backup!`);
    process.exit(1);
  }

  const cars = Array.isArray(parsed.cars) ? parsed.cars : [];
  const dealers = Array.isArray(parsed.dealers) ? parsed.dealers : [];
  const sellers = Array.isArray(parsed.sellers) ? parsed.sellers : [];
  const enquiries = Array.isArray(parsed.enquiries) ? parsed.enquiries : [];
  const admins = Array.isArray(parsed.admins) ? parsed.admins : [];

  console.log(`✅ Backup successfully created with cryptographic SHA-256 verification:`);
  console.log(`   Source:      ${DB_FILE_PATH} (${formatBytes(sourceContent.length)})`);
  console.log(`   Backup:      ${backupFilePath} (${formatBytes(backupContent.length)})`);
  console.log(`   SHA-256:     ${sourceHash}`);
  console.log(`\n📊 Verified Snapshot Counts:`);
  console.log(`   - Cars:      ${cars.length} listings`);
  console.log(`   - Dealers:   ${dealers.length} dealerships`);
  console.log(`   - Sellers:   ${sellers.length} registered sellers`);
  console.log(`   - Enquiries: ${enquiries.length} customer leads`);
  console.log(`   - Admins:    ${admins.length} accounts\n`);
  console.log(`🔒 Recovery command in case of rollback:`);
  console.log(`   npx tsx scripts/backup-data.ts --restore ${path.relative(process.cwd(), backupFilePath)}\n`);
}

async function restoreBackup(targetBackupPath: string) {
  console.log(`\n================================================================================`);
  console.log(`  WowCars Emergency Rollback & Restore Engine`);
  console.log(`================================================================================\n`);

  const resolved = path.isAbsolute(targetBackupPath)
    ? targetBackupPath
    : path.join(process.cwd(), targetBackupPath);

  if (!fs.existsSync(resolved)) {
    console.error(`❌ Backup file not found at: ${resolved}`);
    process.exit(1);
  }

  const backupContent = fs.readFileSync(resolved, "utf8");
  try {
    JSON.parse(backupContent);
  } catch (err) {
    console.error(`❌ Backup file is corrupt or invalid JSON:`, err);
    process.exit(1);
  }

  // Pre-restore snapshot of current state just in case
  if (fs.existsSync(DB_FILE_PATH)) {
    const safetySnapshot = path.join(BACKUP_DIR, `pre_restore_safety_${Date.now()}.json`);
    fs.copyFileSync(DB_FILE_PATH, safetySnapshot);
    console.log(`🛡️  Current state saved before restore to: ${safetySnapshot}`);
  }

  // Atomic write to DB_FILE_PATH
  const tmpPath = path.join(DATA_DIR, `restore_${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, backupContent, "utf8");
  fs.renameSync(tmpPath, DB_FILE_PATH);

  console.log(`✅ Database successfully restored from:`);
  console.log(`   ${resolved}`);
  console.log(`   Active database is now: ${DB_FILE_PATH}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--restore")) {
    const idx = args.indexOf("--restore");
    const target = args[idx + 1];
    if (!target) {
      console.error("❌ Specify the backup file to restore. Example: --restore data/backups/backup.json");
      process.exit(1);
    }
    await restoreBackup(target);
  } else {
    await createBackup();
  }
}

main().catch((err) => {
  console.error("Backup utility failed:", err);
  process.exit(1);
});
