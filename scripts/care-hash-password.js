const crypto = require("crypto");

const password = process.argv[2];
const salt = process.argv[3] || "newsense-care-salt-v1";

if (!password) {
  console.error("Usage: node scripts/care-hash-password.js <password> [salt]");
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(`${salt}${password}`).digest("hex");
console.log(hash);
