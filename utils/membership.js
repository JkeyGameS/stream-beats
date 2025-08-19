
const logger = require("./logger");
const { saveData } = require("../utils/data-store");

// Required channels configuration
const requiredChannels = [
  { id: "@Jk_Bots", name: "Jk Bots", SCname: "ᴊᴋ ʙᴏᴛs"},
  { id: "@G1me0n", name: "Game ON !", SCname: "ɢᴀᴍᴇ ᴏɴ !"},
  { id: "@FreeGameSOne", name: "Free GameS", SCname: "ғʀᴇᴇ ɢᴀᴍᴇs"}
];

// Bot admins
const BOT_ADMINS = [1154246588, 987654321];

/**
 * ɢᴇᴛs ᴜsᴇʀ ᴀɴᴅ ʙᴏᴛ ᴍᴇᴍʙᴇʀsʜɪᴘ sᴛᴀᴛᴜs ғᴏʀ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs.
 * @param {*} bot Telegram bot instance
 * @param {*} userId Telegram user ID
 * @returns {missingUserChats: Array, missingBotAdminChats: Array}
 */
async function getMembershipStatus(bot, userId) {
  const checks = requiredChannels.map(ch =>
    bot.getChatMember(ch.id, userId)
      .then(userMember => ({
        chat: ch,
        joined: ["member", "administrator", "creator"].includes(userMember.status)
      }))
      .catch(() => ({ chat: ch, joined: false }))
  );

  // Get bot info once to avoid multiple calls
  const botUser = await bot.getMe();

  const botChecks = requiredChannels.map(ch =>
    bot.getChatMember(ch.id, botUser.id)
      .then(botMember => ({
        chatId: ch.id,
        botAdmin: ["administrator", "creator"].includes(botMember.status)
      }))
      .catch(() => ({ chatId: ch.id, botAdmin: false }))
  );

  const [userResults, botResults] = await Promise.all([
    Promise.all(checks),
    Promise.all(botChecks)
  ]);

  const missingUserChats = userResults.filter(r => !r.joined).map(r => r.chat);
  const missingBotAdminChats = botResults.filter(r => !r.botAdmin).map(r => r.chatId);

  return { missingUserChats, missingBotAdminChats };
}

/**
 * ɴᴏᴛɪғɪᴇs ʙᴏᴛ ᴀᴅᴍɪɴs ᴀʙᴏᴜᴛ ᴍɪssɪɴɢ ᴀᴅᴍɪɴ ʀɪɢʜᴛs ɪɴ ᴄʜᴀᴛs.
 * @param {*} bot Telegram bot instance
 * @param {Array} missingBotAdminChats List of chat IDs where bot is missing admin
 */
async function notifyBotAdmins(bot, missingBotAdminChats) {
  if (missingBotAdminChats.length === 0) return;

  const message = `<blockquote><b>⚠️ ᴀᴄᴛɪᴏɴ ʀᴇǫᴜɪʀᴇᴅ:</b> ᴍᴀᴋᴇ ᴛʜᴇ ʙᴏᴛ ᴀᴅᴍɪɴ ɪɴ:</blockquote>\n<blockquote><i>${missingBotAdminChats.join(", ")}</i></blockquote>`;

  await Promise.all(
    BOT_ADMINS.map(adminId =>
      bot.sendMessage(adminId, message, { parse_mode: "HTML" }).catch(err =>
        logger.error(`❌ ᴇʀʀᴏʀ ɴᴏᴛɪғʏɪɴɢ ʙᴏᴛ ᴀᴅᴍɪɴ (${adminId}):`, err)
      )
    )
  );
}

/**
 * sᴇɴᴅs ᴊᴏɪɴ ʀᴇᴍɪɴᴅᴇʀ ᴡɪᴛʜ ʟɪɴᴋs ғᴏʀ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟs.
 * @param {*} bot Telegram bot instance
 * @param {*} chatId Chat ID to send the reminder
 * @param {Array} missingUserChats List of missing channels user must join
 */
async function sendJoinReminder(bot, chatId, missingUserChats) {
  const missingList = missingUserChats.map(c => `• ${c.SCname}`).join("\n");

  const joinButtons = missingUserChats.map(c => [{
    text: `ᴊᴏɪɴ ${c.SCname}`,
    url: `https://t.me/${c.id.replace("@", "")}`
  }]);

  joinButtons.push([{ text: "⟳ ᴄʜᴇᴄᴋ ᴀɢᴀɪɴ ⟲", callback_data: "/check_membership" }]);

  return bot.sendMessage(
    chatId,
    `<blockquote>❌ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏᴛ ᴊᴏɪɴᴇᴅ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs</blockquote>\n\n<b>ᴍɪssɪɴɢ:</b>\n<blockquote><b>${missingList}</b></blockquote>\n\n<blockquote>ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴛʜᴇᴍ ғɪʀsᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: joinButtons }
    }
  ).catch(err => logger.error('Error sending join reminder:', err));
}

module.exports = {
  getMembershipStatus,
  notifyBotAdmins,
  sendJoinReminder,
  requiredChannels,
  BOT_ADMINS
};
