const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// --- 1. WEB SERVER CHO CRONJOB.ORG ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot đang chạy 24/7!'));
app.listen(PORT, () => console.log(`Cổng ${PORT} đã mở.`));

// --- 2. CẤU HÌNH BOT ---
const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://www.tiktok.com/@chu2necon)";

const formatNumber = (num) => {
    if (!num) return "0";
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

// --- 3. LỆNH /START ---
bot.onText(/\/start/, (msg) => {
    const helpText = `⚡ /tt ‐ Thông Tin TikTok\n📥 /dl - Tải Video TikTok Không Logo${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, helpText, { 
        parse_mode: 'Markdown', 
        disable_web_page_preview: true 
    });
});

// --- 4. LỆNH /TT (TRA CỨU ĐÃ FIX LỖI) ---
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    const loading = await bot.sendMessage(chatId, `🔍 Đang tra cứu @${username}...`);

    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const data = res.data.data;
        if (data && data.user) {
            const { user, stats } = data;
            const region = user.region || data.region || "VN";
            const caption = `👤 **THÔNG TIN TIKTOK**\n` +
                `─────────────────────────────\n` +
                `📛 **Tên:** ${user.nickname}\n` +
                `🆔 **ID:** \`${user.uniqueId}\`\n` +
                `📝 **Bio:** ${user.signature || "Trống"}\n` +
                `📍 **Vùng:** ${region}\n` +
                `📈 **Followers:** ${formatNumber(stats.followerCount)}\n` +
                `📉 **Following:** ${formatNumber(stats.followingCount)}\n` +
                `❤️ **Lượt Tim:** ${formatNumber(stats.heartCount)}\n` +
                `🎬 **Video:** ${formatNumber(stats.videoCount)}\n` +
                `👥 **Bạn bè:** ${formatNumber(stats.friendCount)}` +
                `${SIGNATURE}`;
            
            try {
                await bot.sendPhoto(chatId, user.avatarLarger || user.avatarThumb, { caption: caption, parse_mode: 'Markdown' });
            } catch (err) {
                await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
            }
            await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
        } else {
            bot.editMessageText(`❌ Không tìm thấy @${username}`, { chat_id: chatId, message_id: loading.message_id });
        }
    } catch (e) {
        bot.editMessageText(`⚠️ Lỗi hệ thống khi tra cứu.`, { chat_id: chatId, message_id: loading.message_id });
    }
});

// --- 5. LỆNH /DL (TẢI VIDEO TIKTOK KHÔNG LOGO) ---
const downloadVideo = async (chatId, url, messageId) => {
    const waitingMsg = await bot.sendMessage(chatId, "🚀 Đang lấy video không logo...");
    try {
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const videoUrl = res.data.data?.play || res.data.data?.wmplay;
        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!`, 
                reply_to_message_id: messageId 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            throw new Error();
        }
    } catch (e) {
        bot.editMessageText(`❌ Lỗi: Link không hợp lệ hoặc API bận.`, { 
            chat_id: chatId, 
            message_id: waitingMsg.message_id 
        });
    }
};

bot.onText(/\/dl (.+)/, async (msg, match) => {
    await downloadVideo(msg.chat.id, match[1].trim(), msg.message_id);
});

// Tự động bắt link khi dán trực tiếp
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const match = msg.text.match(/(https?:\/\/[^\s]+)/g);
    if (match) await downloadVideo(msg.chat.id, match[0], msg.message_id);
});
