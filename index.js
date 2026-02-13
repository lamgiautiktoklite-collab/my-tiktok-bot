const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// Tạo Web Server để giữ bot luôn chạy trên Render
const app = express();
app.get('/', (req, res) => res.send('Bot đang chạy...'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

// Chữ ký cố định
const SIGNATURE = "\n-----------------------------\nMake by: Con Bò (@chu2necon)";

// Hàm định dạng số (Ví dụ: 1,234,567)
const formatNumber = (num) => {
    if (!num) return "0";
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

// --- 1. LỆNH /start ---
bot.onText(/\/start/, (msg) => {
    const helpText = `/tt ‐ Thông Tin TikTok\n/dl - Tải Video Đa Nền Tảng${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, helpText, { 
        reply_to_message_id: msg.message_id 
    });
});

// --- 2. HÀM XỬ LÝ TẢI VIDEO (DÙNG DUY NHẤT API DOUYIN) ---
const downloadVideo = async (chatId, url, messageId) => {
    const waitingMsg = await bot.sendMessage(chatId, "🚀 Đang xử lý link qua API Douyin...");
    try {
        // Sử dụng duy nhất API Douyin
        const apiUrl = `https://api.douyin.wtf/api?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { timeout: 25000 }); // Chờ tối đa 25s
        
        const videoUrl = res.data.data?.url || res.data.url || res.data.data?.play;

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!${SIGNATURE}`,
                reply_to_message_id: messageId 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            throw new Error("Không tìm thấy link video");
        }
    } catch (e) {
        await bot.editMessageText(`❌ API Douyin đang bận hoặc link không hỗ trợ.${SIGNATURE}`, {
            chat_id: chatId,
            message_id: waitingMsg.message_id
        });
    }
};

// --- 3. LỆNH /dl ---
bot.onText(/\/dl (.+)/, async (msg, match) => {
    await downloadVideo(msg.chat.id, match[1].trim(), msg.message_id);
});

// --- 4. TỰ ĐỘNG TẢI KHI NGƯỜI DÙNG DÁN LINK ---
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = msg.text.match(urlRegex);

    if (match) {
        await downloadVideo(msg.chat.id, match[0], msg.message_id);
    }
});

// --- 5. LỆNH /tt (BẢN NÂNG CẤP ĐẦY ĐỦ) ---
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const data = res.data.data;
        
        if (data) {
            const user = data.user;
            const stats = data.stats;
            
            const caption = `👤 **THÔNG TIN TIKTOK**\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📛 **Tên:** ${user.nickname}\n` +
                `🆔 **ID:** \`${user.uniqueId}\`\n` +
                `📝 **Bio:** ${user.signature || "Chưa có tiểu sử"}\n` +
                `🌍 **Vùng:** ${user.region}\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📊 **Followers:** ${formatNumber(stats.followerCount)}\n` +
                `📉 **Following:** ${formatNumber(stats.followingCount)}\n` +
                `❤️ **Tổng Tim:** ${formatNumber(stats.heartCount)}\n` +
                `🎥 **Video đã đăng:** ${formatNumber(stats.videoCount)}\n` +
                `🌟 **Bạn bè:** ${formatNumber(stats.friendCount)}` +
                `${SIGNATURE}`;

            await bot.sendPhoto(chatId, user.avatarLarger, { 
                caption: caption,
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });
        }
    } catch (e) {
        await bot.sendMessage(chatId, `⚠️ Không tìm thấy người dùng này.${SIGNATURE}`);
    }
});

console.log("Bot đã sẵn sàng với đầy đủ tính năng!");
        await bot.editMessageText("❌ Tất cả server đều quá tải với link này. Gợi ý:\n1. Thử lại sau 1 phút.\n2. Kiểm tra link có công khai không.\n3. Nếu video quá dài (>10p), API sẽ từ chối.", {
            chat_id: chatId,
            message_id: waitingMsg.message_id
        });
    }
});

// Lệnh tra cứu TikTok
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const data = res.data.data;
        if (data) {
            await bot.sendPhoto(chatId, data.user.avatarLarger, { 
                caption: `👤 **${data.user.nickname}**\n📊 Follower: ${data.stats.followerCount.toLocaleString()}\n❤️ Tim: ${data.stats.heartCount.toLocaleString()}\n🆔 ID: ${data.user.uniqueId}` 
            });
        }
    } catch (e) {
        await bot.sendMessage(chatId, "⚠️ Không tìm thấy user hoặc API TikTok bận.");
    }
});

console.log("Bot đang khởi động...");
