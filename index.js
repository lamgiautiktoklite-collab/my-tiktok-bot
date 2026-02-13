const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const ADMIN_ID = 5728554562; 
let userList = new Set(); 

bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

bot.onText(/\/vps/, async (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    try {
        await bot.sendMessage(msg.chat.id, `📊 **THỐNG KÊ**\n👥 Người dùng: **${userList.size}**`);
    } catch (e) {}
});

bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang lấy video...");

    try {
        // Sử dụng API đa năng đã fix lỗi encode
        const res = await axios.get(`https://api.vkrhost.com/api/download?url=${encodeURIComponent(url)}`);
        const videoUrl = res.data.data?.url || res.data.url || (res.data.data && res.data.data[0]?.url);

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { caption: "✅ Tải thành công!" });
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            await bot.editMessageText("❌ Link này API hiện chưa hỗ trợ hoặc link riêng tư.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        await bot.editMessageText("⚠️ API bận, hãy thử lại sau.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});

// Giữ lại lệnh /tt tra cứu TikTok
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
        await bot.editMessageText("⚠️ Lỗi hệ thống.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});
