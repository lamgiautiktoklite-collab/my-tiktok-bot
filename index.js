const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/vi.json"));

// --- 1. SETUP SERVER ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot TikTok By Con Bò đang chạy...'));
app.listen(PORT, () => console.log(`Cổng ${PORT} đã mở.`));

// --- 2. CẤU HÌNH BOT ---
const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://www.tiktok.com/@chu2necon)";
const tempStore = new Map();

const formatNumber = (num) => num ? num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') : "0";
const getFlag = (code) => {
    if (!code || code.length !== 2) return "🌍";
    return code.toUpperCase().replace(/./g, char => String.fromPoint(char.charCodeAt(0) + 127397));
};

// --- 3. HÀM XỬ LÝ TIKTOK ---
const handleTikTok = async (chatId, url, messageId, forceMode = 'auto') => {
    const loading = await bot.sendMessage(chatId, "⏳ Đang quét dữ liệu TikTok...");
    try {
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const data = res.data.data;
        if (!data) throw new Error();

        // Xử lý Slide Ảnh (/anh)
        if (data.images && data.images.length > 0 && forceMode !== 'dl') {
            const total = data.images.length;
            const storeId = `img_${Date.now()}`;
            tempStore.set(storeId, data.images);

            const keyboard = [];
            for (let i = 0; i < total; i += 5) {
                keyboard.push(data.images.slice(i, i + 5).map((_, idx) => ({
                    text: `${i + idx + 1}`,
                    callback_data: `pick_${storeId}_${i + idx}`
                })));
            }
            keyboard.push([{ text: "📥 Tải tất cả bộ ảnh", callback_data: `all_${storeId}` }]);

            await bot.sendPhoto(chatId, data.images[0], {
                caption: `📸 Bộ ảnh có **${total} tấm**.\nNhấn số để chọn ảnh, hoặc tải tất cả!${SIGNATURE}`,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard },
                reply_to_message_id: messageId
            });
            return bot.deleteMessage(chatId, loading.message_id);
        }

        // Xử lý Video (/dl)
        if (data.play || data.wmplay) {
            await bot.sendVideo(chatId, data.play || data.wmplay, { 
                caption: `✅ Video không logo của bạn!${SIGNATURE}`, 
                parse_mode: 'Markdown',
                reply_to_message_id: messageId 
            });
            return bot.deleteMessage(chatId, loading.message_id);
        }
    } catch (e) {
        bot.editMessageText("❌ Lỗi: Link hỏng hoặc không hỗ trợ.", { chat_id: chatId, message_id: loading.message_id });
    }
};

// --- 4. HỆ THỐNG LỆNH ---

// Lệnh /start với lời chào SỐ 3
bot.onText(/\/start/, (msg) => {
    const startMsg = `🐄 **BOT TIKTOK BY CON BÒ** 🐄\n\n` +
        `*"Cỏ xanh là của đồng hoang, TikTok chất lượng là vàng của tớ!"*\n\n` +
        `Bạn chỉ việc lướt TikTok, còn lại cứ để Con Bò lo. Video, ảnh hay Profile? Tớ 'nhai' hết trong vòng một hơi thở! 🌾💎\n\n` +
        `/tt [username] - Tra cứu thông tin Profile TikTok\n` +
        `/dl [link] - Tải Video TikTok không logo\n` +
        `/anh [link] - Tải Slide ảnh gốc (có nút chọn)\n\n` +
        `✨ *Mẹo nhỏ: Cứ dán link vào thôi, tớ tự lo hết!*` + 
        `${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, startMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Lệnh /tt (ID Số & Avatar PNG nét)
bot.onText(/\/tt (.+)/, async (msg, match) => {
    const username = match[1].replace('@', '').trim();
    const loading = await bot.sendMessage(msg.chat.id, `🔍 Tra cứu: @${username}...`);
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/info`, { params: { unique_id: username } });
        const d = res.data.data;
        if (d && d.user) {
            const countryName = countries.getName(d.user.region || d.region, "vi") || (d.user.region || "N/A");
            const flag = getFlag(d.user.region || d.region);
            
            const rawAvatar = d.user.avatarLarger || d.user.avatarMedium || d.user.avatarThumb;
            const highResAvatar = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(rawAvatar)}`;

            const cap = `👤 **PROFILE TIKTOK**\n` +
                `──────────────────\n` +
                `📛 **Tên:** ${d.user.nickname}\n` +
                `🆔 **ID:** \`${d.user.id}\`\n` +
                `📍 **Vùng:** ${countryName} ${flag}\n` +
                `📈 **Follow:** ${formatNumber(d.stats.followerCount)}\n` +
                `❤️ **Tim:** ${formatNumber(d.stats.heartCount)}${SIGNATURE}`;
            
            await bot.sendPhoto(msg.chat.id, highResAvatar, { caption: cap, parse_mode: 'Markdown' });
            bot.deleteMessage(msg.chat.id, loading.message_id);
        } else { bot.editMessageText("❌ Không thấy user này.", { chat_id: msg.chat.id, message_id: loading.message_id }); }
    } catch (e) { bot.editMessageText("⚠️ Lỗi tra cứu profile.", { chat_id: msg.chat.id, message_id: loading.message_id }); }
});

bot.onText(/\/dl (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'dl'));
bot.onText(/\/anh (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'anh'));

// --- 5. CALLBACK QUERIES ---
bot.on('callback_query', async (query) => {
    const [action, storeId, index] = query.data.split('_');
    const images = tempStore.get(storeId);
    if (!images) return bot.answerCallbackQuery(query.id, { text: "Dữ liệu hết hạn!" });

    if (action === 'pick') {
        await bot.editMessageMedia({ type: 'photo', media: images[index], caption: `✅ Ảnh ${parseInt(index)+1}/${images.length}${SIGNATURE}`, parse_mode: 'Markdown' }, 
        { chat_id: query.message.chat.id, message_id: query.message.message_id, reply_markup: query.message.reply_markup });
    } 
    if (action === 'all') {
        const mediaGroup = images.map(img => ({ type: 'photo', media: img }));
        for (let i = 0; i < mediaGroup.length; i += 10) await bot.sendMediaGroup(query.message.chat.id, mediaGroup.slice(i, i + 10));
        await bot.deleteMessage(query.message.chat.id, query.message.message_id);
    }
    bot.answerCallbackQuery(query.id);
});

// NHẬN DIỆN LINK TRỰC TIẾP
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/') && msg.text.includes('tiktok.com')) {
        const link = msg.text.match(/(https?:\/\/[^\s]+)/g);
        if (link) handleTikTok(msg.chat.id, link[0], msg.message_id, 'auto');
    }
});
