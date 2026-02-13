const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
// Thêm polling interval để bot không gửi yêu cầu quá dồn dập
const bot = new TelegramBot(token, { polling: { interval: 500, autoStart: true } });

const ADMIN_ID = 5728554562; 
let userList = new Set(); 

// Link API
const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';
const MULTI_API = 'https://api.vkrhost.com/api/download?url=';

// Đếm người dùng
bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

// Lệnh /vps
bot.onText(/\/vps/, async (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    try {
        await bot.sendMessage(msg.chat.id, `📊 **THỐNG KÊ**\n👥 Người dùng: **${userList.size}**`);
    } catch (e) { console.error("Lỗi gửi tin vps"); }
});

// Lệnh /dl
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang lấy video...");

    try {
        const res = await axios.get(`${MULTI_API}${encodeURIComponent(url)}`);
        const videoUrl = res.data.data?.url || res.data.url;

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl);
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            await bot.editMessageText("❌ Không lấy được video.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        await bot.editMessageText("⚠️ Lỗi API hoặc link.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});
