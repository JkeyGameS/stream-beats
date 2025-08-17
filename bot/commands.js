// commands.js
// Handles all bot commands and interactions

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const botConfig = require("../config/bot-config");
const { setupMusicCommands } = require("./music-commands");
const { setupMenuCommands } = require("./menu-commands");

const DATA_FILE = path.join(__dirname, "../data/user-checks.json");

// Admin IDs
const ADMIN_IDS = [1154246588, 987654321];
const BOT_ADMINS = ADMIN_IDS;

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
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error("ᴇʀʀᴏʀ sᴀᴠɪɴɢ ᴅᴀᴛᴀ:", err);
  }
}

let dataStore = loadData();

const requiredChannels = [
  { id: "@Jk_Bots", name: "Jk Bots", SCname: "ᴊᴋ ʙᴏᴛs"},
  { id: "@G1me0n", name: "Game ON !", SCname: "ɢᴀᴍᴇ ᴏɴ !"},
  { id: "@FreeGameSOne", name: "Free GameS", SCname: "ғʀᴇᴇ ɢᴀᴍᴇs"}
];

// HELPER: Check if user is member and bot has admin rights in chat
async function checkMembershipAndBotAdmin(bot, userId, chatId) {
  try {
    const chatMember = await bot.getChatMember(chatId, userId);
    const joined = ["member", "administrator", "creator"].includes(chatMember.status);

    const botUser = await bot.getMe();
    const botMember = await bot.getChatMember(chatId, botUser.id);
    const botAdmin = ["administrator", "creator"].includes(botMember.status);

    return { joined, botAdmin };
  } catch (err) {
    logger.error(`ᴇʀʀᴏʀ ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ ᴏʀ ʙᴏᴛ ᴀᴅᴍɪɴ ɪɴ ${chatId}:`, err);
    return { joined: false, botAdmin: false };
  }
}

function setupCommands(bot) {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let allJoined = true;

    for (const { id: requiredChatId, name } of requiredChannels) {
      try {
        const { joined } = await checkMembershipAndBotAdmin(bot, userId, requiredChatId);
        if (!joined) {
          allJoined = false;
          break;
        }
      } catch (err) {
        logger.error("ᴇʀʀᴏʀ ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ ғᴏʀ /start:", err);
        allJoined = false;
        break;
      }
    }

    if (allJoined) {
      // User joined all channels - send welcome message
      if (!dataStore.CHECKED.users.includes(userId)) {
        dataStore.CHECKED.users.push(userId);
        saveData(dataStore);
      }

      const welcome = botConfig.getWelcomeMessage(msg.from.first_name || "User");
      try {
        await bot.sendPhoto(chatId, "https://t.me/Jkey_GameST/4587", {
          caption: welcome.text,
          parse_mode: "HTML",
          reply_markup: welcome.keyboard
        });
      } catch (err) {
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴡᴇʟᴄᴏᴍᴇ ᴘʜᴏᴛᴏ ᴏɴ /start:", err);
        await bot.sendMessage(chatId, welcome.text, {
          parse_mode: "HTML",
          reply_markup: welcome.keyboard
        });
      }
    } else {
      // User not joined all channels - send join checklist message
      const joinMessage = `<blockquote><b>🔒 ʙᴏᴛ ɪs ᴄᴜʀʀᴇɴᴛʟʏ ʟᴏᴄᴋᴇᴅ 🔒</b></blockquote>
<blockquote>ᴛᴏ ᴜɴʟᴏᴄᴋ ɪᴛ, ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴛʜᴇ ᴄʜᴀɴɴᴇʟs ᴀɴᴅ ɢʀᴏᴜᴘs ʟɪsᴛᴇᴅ ʙᴇʟᴏᴡ ᴛᴏ sᴛᴀʏ ᴜᴘᴅᴀᴛᴇᴅ 🍃</blockquote>
<blockquote>ᴏɴᴄᴇ ʏᴏᴜ’ᴠᴇ ᴊᴏɪɴᴇᴅ, ᴄʟɪᴄᴋ ᴛʜᴇ
<b>» ᴄʜᴇᴄᴋ «</b> ʙᴜᴛᴛᴏɴ</blockquote>`;

      const joinButtons = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "ᴊᴏɪɴ ᴀʟʟ", url: "https://t.me/addlist/osaw0pq3BbBjN2Y8" }],
            [
              { text: "ᴊᴏɪɴ", url: "https://t.me/Jk_Bots" },
              { text: "ᴊᴏɪɴ", url: "https://t.me/FreeGameSOne" }
            ],
            [{ text: "⟳ ᴄʜᴇᴄᴋ ⟲", callback_data: "/check_membership" }]
          ]
        }
      };

      try {
        await bot.sendPhoto(chatId, "https://t.me/Jkey_GameST/4588", {
          caption: joinMessage,
          parse_mode: "HTML",
          reply_markup: joinButtons.reply_markup
        });
      } catch (err) {
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴊᴏɪɴ ᴍᴇssᴀɢᴇ ᴏɴ /start:", err);
      }
    }
  });

  // Callback for membership check
  bot.on("callback_query", async (callbackQuery) => {
    const { data, message, from, id: callbackId } = callbackQuery;

    if (data === "/check_membership") {
      await bot.answerCallbackQuery(callbackId, {
        text: "🔄 ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ..."
      });

      try {
        await bot.deleteMessage(message.chat.id, message.message_id);
      } catch (err) {
        logger.warn("❌ ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴇʟᴇᴛᴇ ᴍᴇssᴀɢᴇ:", err);
      }

      let allJoined = true;
      let missingBotAdminChats = [];
      let missingUserChats = [];

      for (const { id: chatId, name } of requiredChannels) {
        try {
          const { joined, botAdmin } = await checkMembershipAndBotAdmin(bot, from.id, chatId);

          logger.info(`👤 USER ${from.id} IN ${name} (${chatId}): ${joined ? "JOINED ✅" : "NOT JOINED 🚫"}`);
          logger.info(`🤖 ʙᴏᴛ ADMIN IN ${name} (${chatId}): ${botAdmin ? "YES ✅" : "NO 🚫"}`);

          if (!joined) {
            allJoined = false;
            missingUserChats.push(name);
          }

          if (!botAdmin) {
            missingBotAdminChats.push(chatId);
          }
        } catch (err) {
          logger.error(`ᴇʀʀᴏʀ ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ ғᴏʀ ${name} (${chatId}):`, err);
        }
      }

      if (missingBotAdminChats.length > 0) {
        logger.warn(`⚠️ ʙᴏᴛ ᴍɪssɪɴɢ ᴀᴅᴍɪɴ ʀɪɢʜᴛs ɪɴ: ${missingBotAdminChats.join(", ")}`);

        await Promise.all(BOT_ADMINS.map(adminId =>
          bot.sendMessage(
            adminId,
            `<blockquote><b>⚠️ ᴀᴄᴛɪᴏɴ ʀᴇǫᴜɪʀᴇᴅ:</b> ᴋɪɴᴅʟʏ ᴍᴀᴋᴇ ᴛʜᴇ ʙᴏᴛ ᴀɴ ᴀᴅᴍɪɴ ɪɴ:</blockquote>\n<blockquote><i>${missingBotAdminChats.join(", ")}</i></blockquote>`,
            { parse_mode: "HTML" }
          ).catch(err => logger.error(`❌ ᴇʀʀᴏʀ ɴᴏᴛɪғʏɪɴɢ ʙᴏᴛ ᴀᴅᴍɪɴ (${adminId}):`, err))
        ));

        if (message.chat.type === "private" && !ADMIN_IDS.includes(message.chat.id)) {
          await bot.sendMessage(
            message.chat.id,
            "💤 ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ, ʀᴇǫᴜᴇsᴛ ɪɴ ᴘʀᴏɢʀᴇss, ᴛʜɪs ᴄᴀɴ ᴛᴀᴋᴇ ᴀ ғᴇᴡ ᴍɪɴᴜᴛᴇs..."
          );
        }

        return;
      }

      if (allJoined) {
        if (!dataStore.CHECKED.users.includes(from.id)) {
          dataStore.CHECKED.users.push(from.id);
          saveData(dataStore);
        }

        await bot.answerCallbackQuery(callbackId, { text: "ᴊᴏɪɴᴇᴅ ✅" });
   
 try {
  const sentMessage = await bot.sendMessage(
    from.id,
    "✅ ʏᴏᴜ ʜᴀᴠᴇ ᴊᴏɪɴᴇᴅ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs",
    { parse_mode: "HTML" }
  );

  setTimeout(() => {
    bot.deleteMessage(from.id, sentMessage.message_id).catch(console.error);
  }, 5000);
} catch (error) {
  console.error("ғᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ᴏʀ ᴅᴇʟᴇᴛᴇ ᴍᴇssᴀɢᴇ:", error);
}
  
        const welcome = botConfig.getWelcomeMessage(from.first_name || "User");
        try {
          await bot.sendPhoto(message.chat.id, "https://t.me/Jkey_GameST/4587", {
            caption: welcome.text,
            parse_mode: "HTML",
            reply_markup: welcome.keyboard
          });
        } catch (err) {
          logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴡᴇʟᴄᴏᴍᴇ ᴘʜᴏᴛᴏ:", err);
        }
      } else {
        if (!dataStore.NOT_CHECKED.users.includes(from.id)) {
          dataStore.NOT_CHECKED.users.push(from.id);
          saveData(dataStore);
        }

        await bot.answerCallbackQuery(callbackId, { text: "❌ ɴᴏᴛ ᴊᴏɪɴᴇᴅ" });

        let missingList = missingUserChats
  .map(name => {
    const channel = requiredChannels.find(ch => ch.name === name);
    return channel ? `• ${channel.SCname}` : `• ${name}`;
  })
  .join("\n");

        let joinButtons = missingUserChats.map(name => {
  const channel = requiredChannels.find(ch => ch.name === name);
  if (!channel) return null;
  return [{
    text: `ᴊᴏɪɴ ${channel.SCname}`,
    url: `https://t.me/${channel.id.replace("@", "")}`
  }];
}).filter(Boolean);

        joinButtons.push([{ text: "⟳ ᴄʜᴇᴄᴋ ᴀɢᴀɪɴ ⟲", callback_data: "/check_membership" }]);

      await bot.answerCallbackQuery(callbackId, {
        text: "🔄 ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ..."
      });
        
        await bot.sendMessage(
          message.chat.id,
          `<blockquote>❌ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏᴛ ᴊᴏɪɴᴇᴅ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs</blockquote>\n\n<b>ᴍɪssɪɴɢ:</b>\n<blockquote><b>${missingList}</b></blockquote>\n\n<blockquote>ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴛʜᴇᴍ ғɪʀsᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ</blockquote>`,
          {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: joinButtons }
          }
        );
      }
    }
  });

  // /stats command
  bot.onText(/\/stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 ʏᴏᴜ ᴀʀᴇ ɴᴏᴛ ᴀᴜᴛʜᴏʀɪᴢᴇᴅ ᴛᴏ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ."
      );
    }

    const checkedCount = dataStore.CHECKED.users.length;
    const notCheckedCount = dataStore.NOT_CHECKED.users.length;

    const statsMessage = `
📊 <b>ʙᴏᴛ sᴛᴀᴛs</b>
✅ ᴊᴏɪɴᴇᴅ: ${checkedCount}
❌ ɴᴏᴛ ᴊᴏɪɴᴇᴅ: ${notCheckedCount}

<b>✅ ᴊᴏɪɴᴇᴅ ɪᴅs:</b>
<code>${dataStore.CHECKED.users.join(", ") || "ɴᴏɴᴇ"}</code>

<b>❌ ɴᴏᴛ ᴊᴏɪɴᴇᴅ ɪᴅs:</b>
<code>${dataStore.NOT_CHECKED.users.join(", ") || "ɴᴏɴᴇ"}</code>
`;

    bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: "HTML" });
  });

  // Help
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, botConfig.getHelpMessage()).catch(err =>
      logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ʜᴇʟᴘ ᴍᴇssᴀɢᴇ:", err)
    );
  });

  // Ping
  bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, "🏓 ᴘᴏɴɢ! ʙᴏᴛ ɪs ᴏɴʟɪɴᴇ ᴀɴᴅ ʀᴇsᴘᴏɴᴅɪɴɢ.").catch(
      err => logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴘɪɴɢ ʀᴇsᴘᴏɴsᴇ:", err)
    );
  });

  // Echo
  bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const textToEcho = match[1].trim();
    if (textToEcho) {
      const maxLength = botConfig.getMaxEchoLength();
      const echoText =
        textToEcho.length > maxLength
          ? textToEcho.substring(0, maxLength) + "..."
          : textToEcho;
      bot.sendMessage(chatId, `🔄 ᴇᴄʜᴏ: ${echoText}`).catch(err =>
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴇᴄʜᴏ ᴍᴇssᴀɢᴇ:", err)
      );
    } else {
      bot.sendMessage(
        chatId,
        "❌ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴛᴇxᴛ ᴛᴏ ᴇᴄʜᴏ. ᴜsᴀɢᴇ: /echo <ʏᴏᴜʀ ᴛᴇxᴛ>"
      ).catch(err =>
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴇᴄʜᴏ ᴜsᴀɢᴇ ᴍᴇssᴀɢᴇ:", err)
      );
    }
  });

  // Time
  bot.onText(/\/time/, (msg) => {
    const currentTime = new Date().toLocaleString();
    bot.sendMessage(msg.chat.id, `🕐 ᴄᴜʀʀᴇɴᴛ sᴇʀᴠᴇʀ ᴛɪᴍᴇ: ${currentTime}`).catch(
      err => logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴛɪᴍᴇ ᴍᴇssᴀɢᴇ:", err)
    );
  });

  // Chat info
  bot.onText(/\/chatinfo/, (msg) => {
    const chat = msg.chat;
    let chatInfo = `📊 ᴄʜᴀᴛ ɪɴғᴏʀᴍᴀᴛɪᴏɴ\nᴄʜᴀᴛ ɪᴅ: ${chat.id}\nᴄʜᴀᴛ ᴛʏᴘᴇ: ${chat.type}\n`;

    if (chat.title) chatInfo += `ᴛɪᴛʟᴇ: ${chat.title}\n`;
    if (chat.username) chatInfo += `ᴜsᴇʀɴᴀᴍᴇ: @${chat.username}\n`;
    if (chat.description) chatInfo += `ᴅᴇsᴄʀɪᴘᴛɪᴏɴ: ${chat.description}\n`;

    chatInfo += `\nᴜsᴇʀ ɪɴғᴏʀᴍᴀᴛɪᴏɴ:\n\nᴜsᴇʀ ɪᴅ: ${msg.from.id}\nғɪʀsᴛ ɴᴀᴍᴇ: ${msg.from.first_name || "ɴ/ᴀ"}\nʟᴀsᴛ ɴᴀᴍᴇ: ${msg.from.last_name || "ɴ/ᴀ"}\nᴜsᴇʀɴᴀᴍᴇ: ${msg.from.username ? "@" + msg.from.username : "ɴ/ᴀ"}\n`;

    bot.sendMessage(msg.chat.id, chatInfo).catch(err =>
      logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴄʜᴀᴛ ɪɴғᴏ:", err)
    );
  });

  // Config
  bot.onText(/\/config(?:\s+(.*))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1] ? match.trim().split(" ") : [];
    if (args.length === 0) {
      const config = botConfig.getBotInfo();
      const configMessage = `
⚙️ ʙᴏᴛ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ
📝 ɴᴀᴍᴇ: ${config.name}
📖 ᴅᴇsᴄʀɪᴘᴛɪᴏɴ: ${config.description}
🔖 ᴠᴇʀsɪᴏɴ: ${config.version}
⏱️ ʀᴀᴛᴇ ʟɪᴍɪᴛ: ${config.rateLimitCooldown}ms
📏 ᴍᴀx ᴇᴄʜᴏ ʟᴇɴɢᴛʜ: ${config.maxEchoLength} ᴄʜᴀʀᴀᴄᴛᴇʀs
ᴇɴᴀʙʟᴇᴅ ᴄᴏᴍᴍᴀɴᴅs: ${config.enabledCommands.join(", ")}
ᴜsᴇ /config ʜᴇʟᴘ ᴛᴏ sᴇᴇ ᴀᴠᴀɪʟᴀʙʟᴇ ᴏᴘᴛɪᴏɴs.
      `;
      bot.sendMessage(chatId, configMessage).catch(err =>
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴄᴏɴғɪɢ ᴍᴇssᴀɢᴇ:", err)
      );
    } else if (args[0] === "help") {
      const helpMessage = `
⚙️ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ ʜᴇʟᴘ
ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅs:
• /config - sʜᴏᴡ ᴄᴜʀʀᴇɴᴛ ʙᴏᴛ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ
• /config name <new_name> - sᴇᴛ ʙᴏᴛ ɴᴀᴍᴇ
• /config description <new_description> - sᴇᴛ ʙᴏᴛ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ
• /config help - sʜᴏᴡ ᴛʜɪs ʜᴇʟᴘ
      `;
      bot.sendMessage(chatId, helpMessage).catch(err =>
        logger.error("ᴇʀʀᴏʀ sᴇɴᴅɪɴɢ ᴄᴏɴғɪɢ ʜᴇʟᴘ:", err)
      );
    } else if (args === "name" && args.length > 1) {
      const newName = args.slice(1).join(" ");
      if (newName.length > 50) {
        return bot.sendMessage(
          chatId,
          "❌ ʙᴏᴛ ɴᴀᴍᴇ ɪs ᴛᴏᴏ ʟᴏɴɢ. ᴘʟᴇᴀsᴇ ᴜsᴇ 50 ᴄʜᴀʀᴀᴄᴛᴇʀs ᴏʀ ʟᴇss."
        );
      }
      botConfig.updateName(newName);
      bot.sendMessage(chatId, `✅ ʙᴏᴛ ɴᴀᴍᴇ ᴜᴘᴅᴀᴛᴇᴅ ᴛᴏ: "${newName}"`);
    } else if (args === "description" && args.length > 1) {
      const newDescription = args.slice(1).join(" ");
      if (newDescription.length > 200) {
        return bot.sendMessage(
          chatId,
          "❌ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ ɪs ᴛᴏᴏ ʟᴏɴɢ. ᴘʟᴇᴀsᴇ ᴜsᴇ 200 ᴄʜᴀʀᴀᴄᴛᴇʀs ᴏʀ ʟᴇss."
        );
      }
      botConfig.updateDescription(newDescription);
      bot.sendMessage(chatId, `✅ ʙᴏᴛ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ ᴜᴘᴅᴀᴛᴇᴅ ᴛᴏ: "${newDescription}"`);
    } else {
      bot.sendMessage(
        chatId,
        "❌ ɪɴᴠᴀʟɪᴅ ᴄᴏɴғɪɢ ᴄᴏᴍᴍᴀɴᴅ. ᴜsᴇ /config ʜᴇʟᴘ ᴛᴏ sᴇᴇ ᴀᴠᴀɪʟᴀʙʟᴇ ᴏᴘᴛɪᴏɴs."
      );
    }
  });

  // Setup extra commands
  setupMusicCommands(bot);
  setupMenuCommands(bot);

  logger.info("ʙᴏᴛ ᴄᴏᴍᴍᴀɴᴅs ʀᴇɢɪsᴛᴇʀᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ");
}

module.exports = { setupCommands, dataStore };
