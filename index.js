const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Cáp Cầu Con Bò - Final Edition! 🛡️🐄'));
app.listen(PORT, () => console.log(`Cổng ${PORT} đã mở.`));

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

// CHỮ KÝ CHUẨN
const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://www.tiktok.com/@chu2necon)";

const formatNumber = (num) => num ? num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') : "0";

async function processTikTok(chatId, url, mode = 'auto') {
    const loading = await bot.sendMessage(chatId, "🔍 **Đang quét dữ liệu...**", { parse_mode: 'Markdown' });
    try {
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const data = res.data.data;
        if (!data) throw new Error();

        if (data.images && data.images.length > 0 && mode !== 'dl') {
            await bot.deleteMessage(chatId, loading.message_id);
            await bot.sendMessage(chatId, `📸 **TIKTOK SLIDESHOW**\n─────────────────────────────\n🖼️ **Số lượng:** ${data.images.length} ảnh\n\n🚀 *Đang xả ảnh...*`, { parse_mode: 'Markdown' });
            for (let i = 0; i < data.images.length; i += 10) {
                const group = data.images.slice(i, i + 10).map(img => ({ type: 'photo', media: img }));
                await bot.sendMediaGroup(chatId, group);
            }
            return bot.sendMessage(chatId, `✅ **Hoàn tất!**${SIGNATURE}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
        }

        if (data.play) {
            await bot.sendVideo(chatId, data.play, { 
                caption: `🎬 **VIDEO TIKTOK**\n─────────────────────────────\n📝 ${data.title || "Video TikTok"}${SIGNATURE}`, 
                parse_mode: 'Markdown'
            });
            return bot.deleteMessage(chatId, loading.message_id);
        }
    } catch (error) {
        bot.editMessageText("❌ Lỗi xử lý link!", { chat_id: chatId, message_id: loading.message_id });
    }
}

// --- LỆNH /TT: TRA CỨU PROFILE (BỎ VÙNG - ID DÃY SỐ) ---
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const username = match[1].replace('@', '').trim();
    const loading = await bot.sendMessage(msg.chat.id, `🔍 **Đang tra cứu:** @${username}...`);
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const d = res.data.data;
        if (d && d.user) {
            const info = `👤 **THÔNG TIN TIKTOK**\n` +
                         `─────────────────────────────\n` +
                         `📛 **Tên:** ${d.user.nickname}\n` +
                         `🆔 **ID:** \`${d.user.id}\`\n` +
                         `📝 **Bio:** ${d.user.signature || "Trống"}\n` +
                         `📈 **Followers:** ${formatNumber(d.stats.followerCount)}\n` +
                         `📉 **Following:** ${formatNumber(d.stats.followingCount)}\n` +
                         `❤️ **Lượt Tim:** ${formatNumber(d.stats.heartCount)}\n` +
                         `🎬 **Video:** ${formatNumber(d.stats.videoCount)}` +
                         `${SIGNATURE}`;

            await bot.sendPhoto(msg.chat.id, d.user.avatarLarger, { caption: info, parse_mode: 'Markdown' });
            bot.deleteMessage(msg.chat.id, loading.message_id);
        } else {
            bot.editMessageText("❌ Không tìm thấy thông tin người dùng này!", { chat_id: msg.chat.id, message_id: loading.message_id });
        }
    } catch (e) {
        bot.editMessageText("⚠️ Lỗi hệ thống khi tra cứu Profile!", { chat_id: msg.chat.id, message_id: loading.message_id });
    }
});

bot.onText(/\/dl (.+)/, (msg, match) => processTikTok(msg.chat.id, match[1].trim(), 'dl'));
bot.onText(/\/anh (.+)/, (msg, match) => processTikTok(msg.chat.id, match[1].trim(), 'anh'));

bot.onText(/\/start/, (msg) => {
    const startMsg = `🐄 **BOT TIKTOK FOR CON BÒ** 🛡️\n` +
        `─────────────────────────────\n` +
        `🔹 \`/tt  [user]\` : Kiểm tra Profile\n` +
        `🔹 \`/dl  [link]\` : Tải Video TikTok\n` +
        `🔹 \`/anh [link]\` : Tải Slide ảnh\n\n` +
        `💡 *Mẹo: Dán thẳng link vào tớ tự "nhai" luôn!*${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, startMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/') && msg.text.includes('tiktok.com')) {
        const linkMatch = msg.text.match(/(https?:\/\/[^\s]+)/);
        if (linkMatch) processTikTok(msg.chat.id, linkMatch[0], 'auto');
    }
});
