const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Đa Nền Tảng Live!'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://tiktok.com/@chu2necon)";

const formatNumber = (num) => {
    if (!num) return "0";
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

bot.onText(/\/start/, (msg) => {
    const helpText = `⚡ /tt ‐ Thông Tin TikTok\n📥 /dl - Tải Video Đa Nền Tảng${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// --- HÀM TẢI VIDEO MỚI (DÙNG TIKWM VÀ FALLBACK) ---
const downloadVideo = async (chatId, url, messageId) => {
    const waitingMsg = await bot.sendMessage(chatId, "🚀 Đang xử lý link...");
    try {
        // Ưu tiên Tikwm vì nó rất mạnh cho cả TT và Douyin
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const data = res.data.data;
        const videoUrl = data?.play || data?.wmplay || data?.hdplay;

        if (videoUrl) {
            await bot.sendVideo(chatId, videoUrl, { 
                caption: `✅ Tải thành công!`, 
                reply_to_message_id: messageId 
            });
            await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
        } else {
            throw new Error("API không trả về link");
        }
    } catch (e) {
        await bot.editMessageText(`❌ API hiện tại đang bảo trì. Vui lòng thử lại sau vài phút!`, { 
            chat_id: chatId, 
            message_id: waitingMsg.message_id 
        });
    }
};

bot.onText(/\/dl (.+)/, async (msg, match) => {
    await downloadVideo(msg.chat.id, match[1].trim(), msg.message_id);
});

bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const match = msg.text.match(/(https?:\/\/[^\s]+)/g);
    if (match) await downloadVideo(msg.chat.id, match[0], msg.message_id);
});

// --- LỆNH /tt (FIX TRIỆT ĐỂ LỖI VÙNG) ---
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const data = res.data.data;
        if (data) {
            const { user, stats } = data;
            // Kiểm tra region ở nhiều cấp độ để tránh undefined
            const region = user.region || data.region || "Quốc tế";

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

            await bot.sendPhoto(chatId, user.avatarLarger, { 
                caption: caption, 
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });
        }
    } catch (e) {
        await bot.sendMessage(chatId, `⚠️ Không tìm thấy người dùng.${SIGNATURE}`, { 
            parse_mode: 'Markdown', 
            disable_web_page_preview: true 
        });
    }
});
                `❤️ **Lượt Tim:** ${formatNumber(stats.heartCount)}\n` +
                `🎬 **Video:** ${formatNumber(stats.videoCount)}\n` +
                `👥 **Bạn bè:** ${formatNumber(stats.friendCount)}` +
                `${SIGNATURE}`;

            await bot.sendPhoto(chatId, user.avatarLarger || user.avatarThumb, { 
                caption: caption, 
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });
        }
    } catch (e) {
        await bot.sendMessage(chatId, `⚠️ Không tìm thấy người dùng.${SIGNATURE}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
    }
});
