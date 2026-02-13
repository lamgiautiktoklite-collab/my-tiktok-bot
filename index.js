const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// Web server giữ bot sống
const app = express();
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
// Thêm tham số dãn cách polling để tránh lỗi 409
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const ADMIN_ID = 5728554562; 
let userList = new Set(); 

// Đếm người dùng
bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

// LỆNH /vps
bot.onText(/\/vps/, async (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    try {
        await bot.sendMessage(msg.chat.id, `📊 **THỐNG KÊ**\n👥 Người dùng: **${userList.size}**`);
    } catch (e) { console.error("Lỗi VPS"); }
});

// LỆNH /tt (TRA CỨU TIKTOK)
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    const waitingMsg = await bot.sendMessage(chatId, "🔍 Đang tra cứu...");

    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const data = res.data.data;
        if (data) {
            await bot.sendPhoto(chatId, data.user.avatarLarger, { 
                caption: `👤 **${data.user.nickname}**\n📊 Follower: ${data.stats.followerCount.toLocaleString()}` 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            await bot.editMessageText("❌ Không tìm thấy user.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        await bot.editMessageText("⚠️ Lỗi API tra cứu.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});

// LỆNH /dl (TẢI ĐA NỀN TẢNG)
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang lấy video...");

    try {
        const res = await axios.get(`https://api.vkrhost.com/api/download?url=${encodeURIComponent(url)}`);
        const videoUrl = res.data.data?.url || res.data.url;

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl);
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            await bot.editMessageText("❌ Không lấy được video.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        await bot.editMessageText("⚠️ API bận hoặc link lỗi.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});
