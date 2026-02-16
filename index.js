const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/vi.json"));

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot TikTok By Con Bò - Optimized! 🐄'));
app.listen(PORT, () => console.log(`Cổng ${PORT} đã mở.`));

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://www.tiktok.com/@chu2necon)";

// --- CÁC HÀM HỖ TRỢ ---
const formatNumber = (num) => num ? num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') : "0";
const getFlag = (code) => {
    if (!code || code.length !== 2) return "🌍";
    return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

// --- HÀM XỬ LÝ CHÍNH ---
const handleTikTok = async (chatId, url, messageId, forceMode = 'auto') => {
    const loading = await bot.sendMessage(chatId, "🔍 **Đang quét dữ liệu...**", { parse_mode: 'Markdown' });
    try {
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const data = res.data.data;
        if (!data) throw new Error();

        // 1. XỬ LÝ ẢNH (Lệnh /anh hoặc tự động)
        if (data.images && data.images.length > 0 && forceMode !== 'dl') {
            await bot.deleteMessage(chatId, loading.message_id);
            await bot.sendMessage(chatId, `📸 **TIKTOK SLIDESHOW**\n──────────────────\n🖼️ **Số lượng:** ${data.images.length} tấm ảnh\n📝 **Status:** ${data.title || "Không có tiêu đề"}\n\n🚀 *Đang tiến hành xả ảnh...*`, { parse_mode: 'Markdown' });
            
            for (let i = 0; i < data.images.length; i += 10) {
                const group = data.images.slice(i, i + 10).map(img => ({ type: 'photo', media: img }));
                await bot.sendMediaGroup(chatId, group);
            }
            return bot.sendMessage(chatId, `✅ **Hoàn tất!**${SIGNATURE}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
        }

        // 2. XỬ LÝ VIDEO (Lệnh /dl hoặc tự động)
        if (data.play) {
            await bot.sendVideo(chatId, data.play, { 
                caption: `🎬 **VIDEO TIKTOK**\n──────────────────\n📝 ${data.title || "Video không tiêu đề"}${SIGNATURE}`, 
                parse_mode: 'Markdown'
            });
            return bot.deleteMessage(chatId, loading.message_id);
        }
    } catch (e) {
        bot.editMessageText("❌ **Lỗi:** Link hỏng hoặc không hỗ trợ.", { chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown' });
    }
};

// --- CÁC LỆNH (COMMANDS) ---

// Lệnh /start: Sắp xếp lại theo yêu cầu tt -> dl -> anh
bot.onText(/\/start/, (msg) => {
    const startMsg = `🐄 **TIKTOK DOWNLOADER BY CON BÒ**\n` +
        `──────────────────\n` +
        `🔹 \`/tt  [user]\` : Kiểm tra Profile người dùng\n` +
        `🔹 \`/dl  [link]\` : Tải Video TikTok (không logo)\n` +
        `🔹 \`/anh [link]\` : Tải toàn bộ Slide ảnh\n\n` +
        `💡 *Mẹo: Bạn chỉ cần dán thẳng link TikTok vào chat, tớ sẽ tự động tải cho bạn!*${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, startMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Lệnh /tt: Tra cứu Profile
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const username = match[1].replace('@', '').trim();
    const loading = await bot.sendMessage(msg.chat.id, `🔍 **Đang tra:** @${username}...`, { parse_mode: 'Markdown' });
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const d = res.data.data;
        if (d && d.user) {
            const flag = getFlag(d.user.region || d.region);
            const cap = `👤 **PROFILE TIKTOK**\n──────────────────\n📛 **Tên:** ${d.user.nickname}\n🆔 **ID:** \`${d.user.id}\`\n📍 **Vùng:** ${flag}\n📈 **Follower:** ${formatNumber(d.stats.followerCount)}\n❤️ **Tổng Tim:** ${formatNumber(d.stats.heartCount)}${SIGNATURE}`;
            await bot.sendPhoto(msg.chat.id, d.user.avatarLarger, { caption: cap, parse_mode: 'Markdown' });
            bot.deleteMessage(msg.chat.id, loading.message_id);
        } else { bot.editMessageText("❌ Không tìm thấy user.", { chat_id: msg.chat.id, message_id: loading.message_id }); }
    } catch (e) { bot.editMessageText("⚠️ Lỗi hệ thống.", { chat_id: msg.chat.id, message_id: loading.message_id }); }
});

// Lệnh /dl: Tải Video
bot.onText(/\/dl (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'dl'));

// Lệnh /anh: Tải Ảnh
bot.onText(/\/anh (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'anh'));

// --- TỰ ĐỘNG NHẬN DIỆN LINK ---
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/') && msg.text.includes('tiktok.com')) {
        const link = msg.text.match(/(https?:\/\/[^\s]+)/g);
        if (link) handleTikTok(msg.chat.id, link[0], msg.message_id, 'auto');
    }
});
