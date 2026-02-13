const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: true });

// --- ADMIN & THỐNG KÊ ---
const ADMIN_ID = 5728554562; 
let userList = new Set(); 

const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';
const API_PRIMARY = 'https://api.vkrhost.com/api/download?url=';
const API_BACKUP = 'https://api.tikwm.com/api/?url=';

// Đếm người dùng
bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

// LỆNH /vps: XEM THỐNG KÊ (DÀNH CHO ADMIN)
bot.onText(/\/vps/, async (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    const stats = `📊 **THỐNG KÊ**\n👥 Người dùng: **${userList.size}**\n⏱️ Trạng thái: **Live 24/7**`;
    await bot.sendMessage(msg.chat.id, stats, { parse_mode: 'Markdown' });
});

// LỆNH /tt: TRA CỨU TIKTOK
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    const waitingMsg = await bot.sendMessage(chatId, `🔍 Đang tra cứu: @${username}...`);

    try {
        const res = await axios.get(TIKTOK_USER_API, { params: { unique_id: username } });
        const data = res.data.data;
        if (data) {
            await bot.sendPhoto(chatId, data.user.avatarLarger, { 
                caption: `👤 **${data.user.nickname}** (@${data.user.uniqueId})\n📊 Follower: ${data.stats.followerCount.toLocaleString()}`, 
                parse_mode: 'Markdown' 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id);
        } else {
            await bot.editMessageText("❌ Không tìm thấy user.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        await bot.editMessageText("⚠️ Lỗi API tra cứu.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});

// LỆNH /dl: TẢI ĐA NỀN TẢNG
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang lấy video...");

    try {
        let videoUrl = null;

        // Thử API chính
        try {
            const res1 = await axios.get(`${API_PRIMARY}${encodeURIComponent(url)}`);
            videoUrl = res1.data.data?.url || res1.data.data?.download || res1.data.url;
        } catch (err) {}

        // Thử API dự phòng
        if (!videoUrl) {
            try {
                const res2 = await axios.get(`${API_BACKUP}${encodeURIComponent(url)}`);
                videoUrl = res2.data.data?.play || res2.data.data?.wmplay;
            } catch (err) {}
        }

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!\n🌐 Nguồn: Đa nền tảng`,
                reply_to_message_id: msg.message_id 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id);
        } else {
            await bot.editMessageText("❌ Không tìm thấy video công khai ở link này.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (error) {
        await bot.editMessageText("⚠️ Hệ thống bận hoặc link lỗi.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});
