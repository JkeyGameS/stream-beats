
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DATA_FILE = path.join(__dirname, "../data/user-checks.json");

// Load and Save Data Helpers
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (err) {
    logger.error("ᴇʀʀᴏʀ ʟᴏᴀᴅɪɴɢ ᴅᴀᴛᴀ:", err);
  }
  return { CHECKED: { users: [] }, NOT_CHECKED: { users: [] } };
}

function saveData(data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error("ᴇʀʀᴏʀ sᴀᴠɪɴɢ ᴅᴀᴛᴀ:", err);
  }
}

module.exports = { loadData, saveData, DATA_FILE };
