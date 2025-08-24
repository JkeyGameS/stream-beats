// commands.js
// Handles all bot commands and interactions

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const botConfig = require("../config/bot-config");
const { setupMusicCommands } = require("./music-commands");
const { setupMenuCommands, handleCallback: handleMenuCallback } = require("./menu-commands");
const { loadData, saveData } = require("../utils/data-store");

// Admin IDs
const ADMIN_IDS = [1154246588, 987654321];
const BOT_ADMINS = ADMIN_IDS;

let dataStore = loadData();

// Ensure the dataStore has proper structure
if (!dataStore.CHECKED) dataStore.CHECKED = { users: [] };
if (!dataStore.NOT_CHECKED) dataStore.NOT_CHECKED = { users: [] };

const requiredChannels = [
  { id: "@Jk_Bots", name: "Jk Bots", SCname: "ᴊᴋ ʙᴏᴛs" },
  { id: "@G1me0n", name: "Game ON !", SCname: "ɢᴀᴍᴇ ᴏɴ !" },
  { id: "@FreeGameSOne", name: "Free GameS", SCname: "ғʀᴇᴇ ɢᴀᴍᴇs" },
];

// --- HELPER: edit message safely whether it's photo+caption or text ---
async function safeEdit(bot, message, newText, keyboard) {
  const opts = {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: keyboard,
    parse_mode: "HTML"
  };

  try {
    if (message.caption !== undefined) {
      // Message is a photo/media with caption
      await bot.editMessageCaption(newText, opts);
    } else {
      // Message is a normal text message
      await bot.editMessageText(newText, opts);
    }
  } catch (err) {
    console.error("safeEdit error:", err.message);
  }
}

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
    console.error(`Error checking membership or bot admin in ${chatId}:`, err);
    return { joined: false, botAdmin: false };
  }
}

function setupCommands(bot) {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let allJoined = true;
    for (const ch of requiredChannels) {
      const { joined } = await checkMembershipAndBotAdmin(bot, userId, ch.id);
      if (!joined) {
        allJoined = false;
        break;
      }
    }

    if (allJoined) {
      if (!dataStore.CHECKED.users.includes(userId)) {
        dataStore.CHECKED.users.push(userId);
        saveData(dataStore);
      }

      const welcome = botConfig.getWelcomeMessage(msg.from.first_name || "User");
      try {
        const sentMsg = await bot.sendPhoto(chatId, "https://t.me/Jkey_GameST/4587", {
          caption: welcome.text,
          parse_mode: "HTML",
          reply_markup: welcome.keyboard,
        });
        if (!dataStore.WELCOME_MESSAGES) dataStore.WELCOME_MESSAGES = {};
        dataStore.WELCOME_MESSAGES[userId] = { chatId, messageId: sentMsg.message_id };
        saveData(dataStore);
      } catch (err) {
        console.error("Error sending welcome photo on /start:", err);
        try {
          const sentMsg = await bot.sendMessage(chatId, welcome.text, {
            parse_mode: "HTML",
            reply_markup: welcome.keyboard,
          });
          if (!dataStore.WELCOME_MESSAGES) dataStore.WELCOME_MESSAGES = {};
          dataStore.WELCOME_MESSAGES[userId] = { chatId, messageId: sentMsg.message_id };
          saveData(dataStore);
        } catch (err2) {
          console.error("Error sending welcome text fallback on /start:", err2);
        }
      }
    } else {
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
              { text: "ᴊᴏɪɴ", url: "https://t.me/FreeGameSOne" },
            ],
            [{ text: "⟳ ᴄʜᴇᴄᴋ ⟲", callback_data: "/check_membership" }],
          ],
        },
      };

      try {
        await bot.sendPhoto(chatId, "https://t.me/Jkey_GameST/4588", {
          caption: joinMessage,
          parse_mode: "HTML",
          reply_markup: joinButtons.reply_markup,
        });
      } catch (err) {
        console.error("Error sending join message on /start:", err);
      }
    }
  });

  // Callback for membership check and menus
  bot.on("callback_query", async (callbackQuery) => {
    const { data, message, from, id: callbackId } = callbackQuery;

    try {
      // --- Membership check ---
      if (data === "/check_membership") {
        await bot.answerCallbackQuery(callbackId, {
          text: "🔄 ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ...",
        });

        const userId = from.id;
        const missingChats = [];

        for (const ch of requiredChannels) {
          const { joined } = await checkMembershipAndBotAdmin(bot, userId, ch.id);
          if (!joined) missingChats.push(ch);
        }

        if (missingChats.length === 0) {
          if (!dataStore.CHECKED.users.includes(userId)) {
            dataStore.CHECKED.users.push(userId);
            saveData(dataStore);
          }

          const welcome = botConfig.getWelcomeMessage(from.first_name || "User");

          try {
            // ✅ send a new message instead of editing
await bot.editMessageMedia(
  {
    type: "photo",
    media: "https://t.me/Jkey_GameST/4587",
    caption: welcome.text,
    parse_mode: "HTML",
  },
  {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: welcome.keyboard, // <-- use the keyboard object directly
  }
);
            if (!dataStore.WELCOME_MESSAGES) dataStore.WELCOME_MESSAGES = {};
            dataStore.WELCOME_MESSAGES[userId] = { chatId: message.chat.id, messageId: sentMsg.message_id };
            saveData(dataStore);
          } catch (err) {
            console.error("Error sending welcome message after check:", err);
          }

          await bot.answerCallbackQuery(callbackId, { text: "✅ ᴄʜᴇᴄᴋ ᴘᴀssᴇᴅ" });
        } else {
          await bot.answerCallbackQuery(callbackId, { text: "❌ ɴᴏᴛ ᴊᴏɪɴᴇᴅ" });

          const missingList = missingChats.map((c) => `• ${c.SCname}`).join("\n");
          const joinButtons = missingChats.map((c) => [
            { text: `ᴊᴏɪɴ ${c.SCname}`, url: `https://t.me/${c.id.replace("@", "")}` },
          ]);
          joinButtons.push([{ text: "⟳ ᴄʜᴇᴄᴋ ᴀɢᴀɪɴ ⟲", callback_data: "/check_membership" }]);

          try {
await bot.editMessageMedia(
  {
    type: "photo",
    media: "https://t.me/Jkey_GameST/4589",
    caption: `<blockquote>❌ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏᴛ ᴊᴏɪɴᴇᴅ ᴀʟʟ ʀᴇǫᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟs</blockquote>\n\n<b>ᴍɪssɪɴɢ:</b>\n<blockquote><b>${missingList}</b></blockquote>\n\n<blockquote>ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴛʜᴇᴍ ғɪʀsᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ</blockquote>`,
    parse_mode: "HTML",
  },
  {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: joinButtons },
  });
                 } catch (err) {
     console.error("Error sending join reminder message:", err);
          }
        }
        return;
      }

      // --- Menu buttons (safe edit for text or photo) ---
      if (data.startsWith("menu_") || data.startsWith("music_") || data.startsWith("quick_") || data.startsWith("utility_")) {
        const userId = from.id;
        const chatId = message.chat.id;

        console.log(`[CALLBACK] User ${from.first_name} (${userId}) clicked: ${data}`);

        const { text, keyboard } = (await handleMenuCallback(bot, chatId, data, callbackQuery)) || {};
        if (text && keyboard) {
          await safeEdit(bot, message, text, keyboard);
        }

        await bot.answerCallbackQuery(callbackId);
        return;
      }
    } catch (error) {
      console.error("Error in callback query handler:", error);
      await bot
        .answerCallbackQuery(callbackId, { text: "❌ An error occurred" })
        .catch((err) => console.error("Error answering error callback:", err));
    }
  });
  // --- END CALLBACK QUERY HANDLER ---

  // /stats command
  bot.onText(/\/stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, "🚫 You are not authorized to use this command.");
    }
    const checkedCount = dataStore.CHECKED.users.length;
    const notCheckedCount = dataStore.NOT_CHECKED.users.length;
    const statsMessage = `
📊 <b>Bot Stats</b>
✅ Joined: ${checkedCount}
❌ Not joined: ${notCheckedCount}

<b>✅ Joined IDs:</b>
<code>${dataStore.CHECKED.users.join(", ") || "None"}</code>

<b>❌ Not joined IDs:</b>
<code>${dataStore.NOT_CHECKED.users.join(", ") || "None"}</code>
`;
    bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: "HTML" });
  });

  // /help
  bot.onText(/\/help/, (msg) => {
    bot
      .sendMessage(msg.chat.id, botConfig.getHelpMessage())
      .catch((err) => console.error("Error sending help message:", err));
  });

  // /ping
  bot.onText(/\/ping/, (msg) => {
    bot
      .sendMessage(msg.chat.id, "🏓 Pong! Bot is online and responding.")
      .catch((err) => console.error("Error sending ping response:", err));
  });

  // /echo
  bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const textToEcho = match[1].trim();
    if (textToEcho) {
      const maxLength = botConfig.getMaxEchoLength();
      const echoText =
        textToEcho.length > maxLength ? textToEcho.substring(0, maxLength) + "..." : textToEcho;
      bot
        .sendMessage(chatId, `🔄 Echo: ${echoText}`)
        .catch((err) => console.error("Error sending echo message:", err));
    } else {
      bot
        .sendMessage(msg.chat.id, "❌ Please provide text to echo. Usage: /echo <your text>")
        .catch((err) => console.error("Error sending echo usage message:", err));
    }
  });

  // /time
  bot.onText(/\/time/, (msg) => {
    const currentTime = new Date().toLocaleString();
    bot
      .sendMessage(msg.chat.id, `🕐 Current server time: ${currentTime}`)
      .catch((err) => console.error("Error sending time message:", err));
  });

  // /chatinfo
  bot.onText(/\/chatinfo/, (msg) => {
    const chat = msg.chat;
    let chatInfo = `📊 Chat Information\nChat ID: ${chat.id}\nType: ${chat.type}\n`;
    if (chat.title) chatInfo += `Title: ${chat.title}\n`;
    if (chat.username) chatInfo += `Username: @${chat.username}\n`;
    if (chat.description) chatInfo += `Description: ${chat.description}\n`;
    chatInfo += `\nUser Information:\nID: ${msg.from.id}\nFirst Name: ${
      msg.from.first_name || "N/A"
    }\nLast Name: ${msg.from.last_name || "N/A"}\nUsername: ${
      msg.from.username ? "@" + msg.from.username : "N/A"
    }\n`;
    bot.sendMessage(msg.chat.id, chatInfo).catch((err) => console.error("Error sending chat info:", err));
  });

  // /config
  bot.onText(/\/config(?:\s+(.*))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1] ? match[1].trim().split(" ") : [];
    if (args.length === 0) {
      const config = botConfig.getBotInfo();
      const configMessage = `⚙️ Bot Configuration
📝 Name: ${config.name}
📖 Description: ${config.description}
🔖 Version: ${config.version}
⏱️ Rate Limit: ${config.rateLimitCooldown}ms
📏 Max Echo Length: ${config.maxEchoLength} characters
Enabled Commands: ${config.enabledCommands.join(", ")}
Use /config help to see available options.`;
      bot.sendMessage(chatId, configMessage).catch((err) => console.error("Error sending config message:", err));
    } else if (args[0] === "help") {
      const helpMessage = `⚙️ Configuration Help
Available commands:
• /config - Show current bot configuration
• /config name <new_name> - Set bot name
• /config description <new_description> - Set bot description
• /config help - Show this help`;
      bot.sendMessage(chatId, helpMessage).catch((err) => console.error("Error sending config help:", err));
    } else if (args[0] === "name" && args.length > 1) {
      const newName = args.slice(1).join(" ").trim();
      if (newName.length > 50) {
        return bot.sendMessage(chatId, "❌ Bot name is too long. Please use 50 characters or less.");
      }
      botConfig.updateName(newName);
      bot.sendMessage(chatId, `✅ Bot name updated to: "${newName}"`);
    } else if (args[0] === "description" && args.length > 1) {
      const newDescription = args.slice(1).join(" ").trim();
      if (newDescription.length > 200) {
        return bot.sendMessage(chatId, "❌ Description is too long. Please use 200 characters or less.");
      }
      botConfig.updateDescription(newDescription);
      bot.sendMessage(chatId, `✅ Bot description updated to: "${newDescription}"`);
    } else {
      bot.sendMessage(chatId, "❌ Invalid config command. Use /config help to see available options.");
    }
  });

  // Initialize music and menu commands
  setupMusicCommands(bot);
  setupMenuCommands(bot);

  console.info("Bot commands registered successfully");
}

module.exports = { setupCommands, dataStore };