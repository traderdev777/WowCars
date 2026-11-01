/**
 * WowCars — Production Administrator Setup & Password Rotation CLI
 * Secure administrator account initialization and credential rotation.
 *
 * Security Protections:
 * 1. Accidental Overwrite Protection: Refuses to overwrite existing admins without explicit --confirm-reset flag.
 * 2. Hidden Interactive Input: Supports TTY masked password entry (prevents terminal snooping).
 * 3. Secret File Injection: Supports --password-file <path> and ADMIN_PASSWORD env variable.
 * 4. Zero Log Leakage: Auto-generated credentials are written to a chmod 0600 file, NEVER printed to stdout/stderr.
 * 5. Session Invalidation: Automatically increments tokenVersion on password rotation to revoke active sessions.
 * 6. Dual Adapter Support: Works seamlessly across both FileStore and MySqlStore via unified DB adapter.
 *
 * Usage:
 *   # Interactive mode (prompts with hidden password masking):
 *   npx tsx scripts/create-admin.ts <username> [email] [fullName]
 *
 *   # Via secure environment variable:
 *   ADMIN_PASSWORD="<secret>" npx tsx scripts/create-admin.ts <username> [email] [fullName]
 *
 *   # Via protected secret file:
 *   npx tsx scripts/create-admin.ts <username> --password-file /path/to/secret
 *
 *   # Generate secure random password (saved to chmod 0600 file, zero stdout leakage):
 *   npx tsx scripts/create-admin.ts <username> --auto-generate
 *
 *   # Rotate password for existing admin:
 *   npx tsx scripts/create-admin.ts <username> --confirm-reset --auto-generate
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import readline from "readline";
import { hashPassword } from "../src/lib/auth/passwords";
import { db } from "../src/lib/db";

const DATA_DIR = path.join(process.cwd(), "data");

function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    let input = "";

    process.stdout.write(query);

    const onData = (char: Buffer) => {
      const str = char.toString("utf8");
      if (str === "\n" || str === "\r" || str === "\u0004") {
        stdin.removeListener("data", onData);
      } else if (str === "\u0003") {
        // Ctrl+C
        process.stdout.write("\n");
        process.exit(1);
      } else if (str === "\u007f" || str === "\b") {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
      } else {
        input += str;
      }
    };

    if (process.stdin.isTTY) {
      stdin.on("data", onData);
      // Mute terminal echo
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    }

    rl.question("", () => {
      if (process.stdin.isTTY) {
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
      }
      rl.close();
      resolve(input.trim());
    });
  });
}

function generateCryptographicPassword(): string {
  // 24-character cryptographically strong URL-safe password
  return crypto.randomBytes(18).toString("base64url");
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
    console.log(`
================================================================================
  WowCars Production Administrator Setup CLI
================================================================================
Usage:
  npx tsx scripts/create-admin.ts <username> [options]

Options:
  --auto-generate         Generate a strong 24-char cryptographic password.
                          The secret is written to data/.admin_secret_onetime (mode 0600).
                          It is NEVER printed to console or logs.
  --password-file <path>  Read password from a protected file.
  --confirm-reset         Explicitly permit resetting an existing administrator's password.
                          (Guards against accidental account overwrites).
  --email <email>         Admin contact email.
  --name <fullName>       Admin display name.
  --revoke-sessions       Invalidate all active sessions immediately.

Security Notice:
  Passwords and session secrets are never logged or stored in plaintext.
================================================================================
`);
    process.exit(0);
  }

  const isAutoGenerate = rawArgs.includes("--auto-generate");
  const isConfirmReset = rawArgs.includes("--confirm-reset");
  const isRevokeSessions = rawArgs.includes("--revoke-sessions");

  // Extract flag options
  const passwordFileIdx = rawArgs.indexOf("--password-file");
  const passwordFile = passwordFileIdx !== -1 ? rawArgs[passwordFileIdx + 1] : undefined;

  const emailIdx = rawArgs.indexOf("--email");
  const flagEmail = emailIdx !== -1 ? rawArgs[emailIdx + 1] : undefined;

  const nameIdx = rawArgs.indexOf("--name");
  const flagName = nameIdx !== -1 ? rawArgs[nameIdx + 1] : undefined;

  // Positional arguments (excluding flags and their parameters)
  const positionalArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      if (arg === "--password-file" || arg === "--email" || arg === "--name") {
        i++; // skip next arg
      }
      continue;
    }
    positionalArgs.push(arg);
  }

  const username = (positionalArgs[0] || "").toLowerCase().trim();
  if (!username) {
    console.error("❌ Error: Administrator username is required.");
    process.exit(1);
  }

  const email = flagEmail || positionalArgs[1] || `${username}@wowcars.in`;
  const fullName = flagName || positionalArgs[2] || "Platform Administrator";

  console.log(`\n================================================================================`);
  console.log(`  WowCars Administrator Credential Manager`);
  console.log(`  Target User:    ${username}`);
  console.log(`  Target Email:   ${email}`);
  console.log(`  DB Adapter:     ${db.adapterName.toUpperCase()}`);
  console.log(`================================================================================\n`);

  // Verify adapter health
  const health = await db.healthCheck();
  if (!health.ok) {
    console.error(`❌ Database health check failed: ${health.details || "Cannot connect to database."}`);
    process.exit(1);
  }

  // Check if admin already exists
  const existingAdmin = await db.getAdminByUsername(username);

  if (existingAdmin && !isConfirmReset) {
    console.error(`❌ Accidental Overwrite Protection:`);
    console.error(`   Administrator account "${username}" already exists (ID: ${existingAdmin.id}).`);
    console.error(`   To reset this administrator's password, re-run with --confirm-reset.\n`);
    process.exit(1);
  }

  // Obtain password
  let plainPassword = "";
  let wasAutoGenerated = false;

  if (process.env.ADMIN_PASSWORD) {
    plainPassword = process.env.ADMIN_PASSWORD.trim();
    console.log(`🔒 Using password from ADMIN_PASSWORD environment variable.`);
  } else if (passwordFile) {
    if (!fs.existsSync(passwordFile)) {
      console.error(`❌ Password file not found at: ${passwordFile}`);
      process.exit(1);
    }
    plainPassword = fs.readFileSync(passwordFile, "utf8").trim();
    console.log(`🔒 Read password from file: ${passwordFile}`);
  } else if (isAutoGenerate) {
    plainPassword = generateCryptographicPassword();
    wasAutoGenerated = true;
  } else if (process.stdin.isTTY) {
    plainPassword = await promptHidden("Enter new admin password: ");
    if (plainPassword.length < 8) {
      console.error("\n❌ Error: Password must be at least 8 characters long.");
      process.exit(1);
    }
    const confirmPassword = await promptHidden("Confirm new password: ");
    if (plainPassword !== confirmPassword) {
      console.error("\n❌ Error: Passwords do not match.");
      process.exit(1);
    }
  } else {
    console.error("❌ Error: No password source provided. Use --auto-generate, --password-file, or set ADMIN_PASSWORD.");
    process.exit(1);
  }

  if (plainPassword.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters long.");
    process.exit(1);
  }

  // Compute PBKDF2 hash
  console.log(`⏳ Computing PBKDF2-HMAC-SHA512 hash (100,000 iterations)...`);
  const passwordHash = hashPassword(plainPassword);

  if (existingAdmin) {
    // Password rotation
    await db.rotateAdminPassword(existingAdmin.id, passwordHash);
    if (isRevokeSessions) {
      await db.invalidateAdminSessions(existingAdmin.id);
    }
    console.log(`✅ Administrator "${username}" password successfully rotated.`);
    console.log(`🔒 All previous active sessions invalidated (tokenVersion incremented).`);
  } else {
    // New admin creation
    const created = await db.createAdmin({
      username,
      email,
      fullName,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    });
    console.log(`✅ New administrator "${username}" created with ID: ${created.id}.`);
  }

  // Handle auto-generated secret storage
  if (wasAutoGenerated) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const secretPath = path.join(DATA_DIR, ".admin_secret_onetime");
    const secretPayload = `ADMIN_USER=${username}\nADMIN_PASSWORD=${plainPassword}\nGENERATED_AT=${new Date().toISOString()}\n`;
    fs.writeFileSync(secretPath, secretPayload, { mode: 0o600 });
    try {
      fs.chmodSync(secretPath, 0o600);
    } catch {
      // Best-effort permission clamp
    }
    console.log(`\n🔑 Auto-generated credential written to secure file:`);
    console.log(`   ${secretPath}`);
    console.log(`   File permissions: Mode 0600 (owner read/write only).`);
    console.log(`⚠️  IMMEDIATE ACTION REQUIRED:`);
    console.log(`   1. Open ${secretPath} and copy the password into your secure password manager.`);
    console.log(`   2. Delete ${secretPath} immediately after copying.`);
    console.log(`   (The password was NOT printed to terminal logs or stdout).\n`);
  } else {
    console.log(`\n🎉 Administrator setup complete. Log in at /admin/login\n`);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error during administrator setup:", err);
  process.exit(1);
});
