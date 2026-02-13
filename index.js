const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- CẤU HÌNH WEB SERVER CHỐNG NGỦ (BẮT BUỘC CHO RENDER) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot TikTok is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại port ${PORT}`);
});

// --- LẤY TOKEN TỪ ENVIRONMENT VARIABLES ---
const token = process.env.TELEGRAM_TOKEN; 

if (!token) {
    console.error("LỖI: Chưa cấu hình TELEGRAM_TOKEN trong Environment Variables!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';
const TIKTOK_VIDEO_API = 'https://www.tikwm.com/api/';

// Lệnh /tt: Tra cứu thông tin người dùng
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();

    bot.sendMessage(chatId, `🔍 Đang tra cứu người dùng: @${username}...`);

    try {
        const res = await axios.get(TIKTOK_USER_API, { params: { unique_id: username } });
        const data = res.data.data;

        if (data) {
            const userInfo = `
👤 **Hồ sơ TikTok**
━━━━━━━━━━━━━━━━━━
📛 **Tên:** ${data.user.nickname} (@${data.user.uniqueId})
📝 **Tiểu sử:** ${data.user.signature || 'Trống'}
📊 **Thống kê:**
🔹 **Followers:** ${data.stats.followerCount.toLocaleString()}
🔹 **Following:** ${data.stats.followingCount.toLocaleString()}
🔹 **Lượt Tim:** ${data.stats.heartCount.toLocaleString()}
🔹 **Số video:** ${data.stats.videoCount.toLocaleString()}

🔗 [Mở TikTok](https://www.tiktok.com/@${data.user.uniqueId})
            `;
            bot.sendPhoto(chatId, data.user.avatarLarger, { caption: userInfo, parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "❌ Không tìm thấy người dùng này.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Lỗi kết nối API.");
    }
});

// Lệnh /dl: Tải video không logo
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    bot.sendMessage(chatId, "⏳ Đang lấy video không logo...");

    try {
        const res = await axios.get(TIKTOK_VIDEO_API, { params: { url: url } });
        const videoData = res.data.data;

        if (videoData && videoData.play) {
            bot.sendVideo(chatId, videoData.play, { caption: "✅ Video sạch của bạn đây!" });
        } else {
            bot.sendMessage(chatId, "❌ Link không hợp lệ hoặc lỗi API.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Lỗi hệ thống khi tải video.");
    }
});

console.log("Bot đã sẵn sàng!");
