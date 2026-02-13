const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- CẤU HÌNH WEB SERVER CHỐNG NGỦ ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Multi-Downloader is running 24/7!'));
app.listen(PORT, () => console.log(`Server đang lắng nghe tại port ${PORT}`));

// --- LẤY TOKEN ---
const token = process.env.TELEGRAM_TOKEN; 
if (!token) {
    console.error("LỖI: Chưa cấu hình TELEGRAM_TOKEN!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// --- CẤU HÌNH ADMIN & THỐNG KÊ ---
const ADMIN_ID = 5728554562; 
let userList = new Set(); 

const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';
const API_PRIMARY = 'https://api.vkrhost.com/api/download?url=';
const API_BACKUP = 'https://api.tikwm.com/api/?url=';

// Đếm người dùng
bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

// LỆNH /vps: XEM THỐNG KÊ
bot.onText(/\/vps/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    bot.sendMessage(msg.chat.id, `📊 **THỐNG KÊ**\n👥 Người dùng: **${userList.size}**\n⏱️ Trạng thái: **Live 24/7**`, { parse_mode: 'Markdown' });
});

// LỆNH /tt: TRA CỨU TIKTOK (XÓA TIN CHỜ)
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    const waitingMsg = await bot.sendMessage(chatId, `🔍 Đang tra cứu: @${username}...`);

    try {
        const res = await axios.get(TIKTOK_USER_API, { params: { unique_id: username } });
        const data = res.data.data;
        if (data) {
            await bot.sendPhoto(chatId, data.user.avatarLarger, { 
                caption: `👤 **${data.user.nickname}** (@${data.user.uniqueId})\n📊 Follower: ${data.stats.followerCount.toLocaleString()}\n❤️ Tim: ${data.stats.heartCount.toLocaleString()}`, 
                parse_mode: 'Markdown' 
            });
            bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            bot.editMessageText("❌ Không tìm thấy user.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (e) {
        bot.editMessageText("⚠️ Lỗi API tra cứu.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});

// LỆNH /dl: TẢI ĐA NỀN TẢNG (FIX LỖI FB REELS)
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang phân tích video (FB/TikTok/YT)...");

    try {
        let videoUrl = null;

        // THỬ API 1 (Đa năng)
        try {
            const res1 = await axios.get(`${API_PRIMARY}${encodeURIComponent(url)}`);
            videoUrl = res1.data.data?.url || res1.data.data?.download || res1.data.url;
        } catch (e) {}

        // THỬ API 2 (Dự phòng cực mạnh cho Reels/TikTok)
        if (!videoUrl) {
            try {
                const res2 = await axios.get(`${API_BACKUP}${encodeURIComponent(url)}`);
                videoUrl = res2.data.data?.play || res2.data.data?.wmplay;
            } catch (e) {}
        }

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!\n🌐 Nguồn: Facebook/TikTok`,
                reply_to_message_id: msg.message_id 
            });
            bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            bot.editMessageText("❌ Không tìm thấy video. Link có thể riêng tư hoặc API đang quá tải.", { chat_id: chatId, message_id: waitingMsg.message_id });
        }
    } catch (error) {
        bot.editMessageText("⚠️ Lỗi: Link không hợp lệ hoặc hệ thống đang bảo trì.", { chat_id: chatId, message_id: waitingMsg.message_id });
    }
});

console.log("Bot đã cập nhật cơ chế Fix lỗi Facebook Reels!");

    bot.sendMessage(chatId, "⏳ Đang phân tích link (TikTok, FB, YT, IG...)...");

    try {
        // Gọi API đa năng mới
        const res = await axios.get(`${MULTI_API}${encodeURIComponent(url)}`);
        const result = res.data;

        // Lấy link video từ kết quả trả về
        const videoUrl = result.data?.url || result.data?.download || result.url;

        if (videoUrl) {
            bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!\n🌐 Nguồn: ${new URL(url).hostname}`,
                reply_to_message_id: msg.message_id 
            });
        } else {
            bot.sendMessage(chatId, "❌ Không tìm thấy video hoặc nền tảng này chưa được hỗ trợ.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Lỗi: Link không hợp lệ hoặc API đang bảo trì.");
    }
});

console.log("Bot đa năng + Tra cứu TikTok đã sẵn sàng!");
