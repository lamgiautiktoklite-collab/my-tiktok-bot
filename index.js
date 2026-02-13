const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- CẤU HÌNH WEB SERVER CHỐNG NGỦ ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Multi-Downloader is running 24/7!');
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

// API Cũ (Giữ lại cho tra cứu TikTok)
const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';

// API Mới (Cho tải đa nền tảng)
const MULTI_API = 'https://api.vkrhost.com/api/download?url=';

// ==========================================
// LỆNH /tt: GIỮ NGUYÊN TRA CỨU TIKTOK
// ==========================================
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();

    bot.sendMessage(chatId, `🔍 Đang tra cứu người dùng TikTok: @${username}...`);

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
        bot.sendMessage(chatId, "⚠️ Lỗi kết nối API tra cứu.");
    }
});

// ==========================================
// LỆNH /dl: NÂNG CẤP TẢI ĐA NỀN TẢNG
// ==========================================
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

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
