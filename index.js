const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '8393417907:AAHTw-GXnEXZg5-SXglOE21_ld8YslBk4bY';
const bot = new TelegramBot(token, { polling: true });

const TIKTOK_USER_API = 'https://www.tikwm.com/api/user/info';
const TIKTOK_VIDEO_API = 'https://www.tikwm.com/api/';

// Lệnh /tt: Tra cứu thông tin người dùng
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', ''); // Loại bỏ ký tự @ nếu người dùng nhập vào

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
✅ **Xác minh:** ${data.user.verified ? 'Rồi' : 'Chưa'}
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
        bot.sendMessage(chatId, "⚠️ Có lỗi xảy ra khi kết nối API.");
    }
});

// Lệnh /dl: Vẫn giữ nguyên để tải video không logo
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    bot.sendMessage(chatId, "⏳ Đang lấy video không logo...");

    try {
        const res = await axios.get(TIKTOK_VIDEO_API, { params: { url: url } });
        const videoData = res.data.data;

        if (videoData && videoData.play) {
            bot.sendVideo(chatId, videoData.play, { caption: "✅ Video không logo của bạn đây!" });
        } else {
            bot.sendMessage(chatId, "❌ Link video không hợp lệ hoặc lỗi API.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Lỗi hệ thống khi tải video.");
    }
});

console.log("Bot đã sẵn sàng tra cứu và tải video!");

