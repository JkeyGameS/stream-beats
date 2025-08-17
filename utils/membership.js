// membership.js
 // Handles user membership checks and user data storage

async function userIsMember(bot, userId, chatId) {
  try {
    const me = await bot.getMe();
    const botMember = await bot.getChatMember(chatId, me.id);

    const isBotAdmin = ["administrator", "creator"].includes(botMember.status);
    if (!isBotAdmin) {
      logger.warn(`❌ Bot is NOT admin in ${chatId}`);
      return { joined: false, botAdmin: false };
    }

    const member = await bot.getChatMember(chatId, userId);
    const joinedStatuses = ["member", "administrator", "creator"];
    const joined = joinedStatuses.includes(member.status);

    logger.info(`👤 User ${userId} in ${chatId}: ${joined ? "JOINED" : "NOT JOINED"}`);
    return { joined, botAdmin: true };

  } catch (err) {
    logger.error(`Error checking membership in ${chatId}: ${err.message}`);
    return { joined: false, botAdmin: false };
  }
}

const { BOT_ADMINS, ADMIN_IDS, requiredChannels } = require("../config/bot-config");
const logger = require("../utils/logger");
const { saveData } = require("../utils/data-store");

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
    `<blockquote>❌ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏᴛ ᴊᴏɪɴᴇᴅ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs</blockquote>\n\n<b>ᴍɪssɪɴɢ:</b>\n<blockquote><b>${missingList}</b></blockquote>\n\n<blockquote>ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴛʜᴇᴍ ꜰɪʀsᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ</blockquote>`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: joinButtons } }
  );
}

module.exports = { 
  userIsMember,
  getMembershipStatus, 
  notifyBotAdmins, 
  sendJoinReminder 
};