const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/vi.json"));

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot TikTok By Con Bò đang live!'));
app.listen(PORT, () => console.log(`Cổng ${PORT} đã mở.`));

const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const SIGNATURE = "\n\n[『 ᴍᴀᴋᴇ ʙʏ: ᴄᴏɴ ʙᴏ̀ (@ᴄʜᴜ𝟸ɴᴇᴄᴏɴ) 』](https://www.tiktok.com/@chu2necon)";
const tempStore = new Map();

const getFlag = (code) => {
    if (!code || code.length !== 2) return "🌍";
    return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

// Hàm tạo bàn phím phân trang
const createPhotoKeyboard = (storeId, total, currentPage = 0) => {
    const pageSize = 10;
    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, total);
    
    const keyboard = [];
    let row = [];
    
    // Nút chọn ảnh từ start đến end
    for (let i = start; i < end; i++) {
        row.push({ text: `${i + 1}`, callback_data: `p_${storeId}_${i}` });
        if (row.length === 5) { keyboard.push(row); row = []; }
    }
    if (row.length > 0) keyboard.push(row);

    // Nút điều hướng trang
    const navRow = [];
    if (currentPage > 0) navRow.push({ text: "◀️ Trang trước", callback_data: `page_${storeId}_${currentPage - 1}` });
    if (end < total) navRow.push({ text: "Trang sau ▶️", callback_data: `page_${storeId}_${currentPage + 1}` });
    if (navRow.length > 0) keyboard.push(navRow);

    // Nút chức năng
    keyboard.push([{ text: "📥 Tải tất cả (Số 0)", callback_data: `all_${storeId}` }]);
    
    return { inline_keyboard: keyboard };
};

const handleTikTok = async (chatId, url, messageId, forceMode = 'auto') => {
    const loading = await bot.sendMessage(chatId, "⏳ Đang quét dữ liệu TikTok...");
    try {
        const res = await axios.get(`https://www.tikwm.com/api/`, { params: { url: url } });
        const data = res.data.data;
        if (!data) throw new Error();

        if (data.images && data.images.length > 0 && forceMode !== 'dl') {
            const storeId = Math.random().toString(36).substring(7);
            tempStore.set(storeId, data.images);

            await bot.sendPhoto(chatId, data.images[0], {
                caption: `📸 Bộ ảnh có **${data.images.length} tấm**.\nĐang hiển thị trang 1 (Ảnh 1-10).${SIGNATURE}`,
                parse_mode: 'Markdown',
                reply_markup: createPhotoKeyboard(storeId, data.images.length, 0),
                reply_to_message_id: messageId
            });
            return bot.deleteMessage(chatId, loading.message_id);
        }

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

bot.on('callback_query', async (query) => {
    const [action, storeId, val] = query.data.split('_');
    const images = tempStore.get(storeId);
    if (!images) return bot.answerCallbackQuery(query.id, { text: "⚠️ Dữ liệu hết hạn!" });

    try {
        if (action === 'p') { // Chọn ảnh lẻ
            await bot.editMessageMedia({
                type: 'photo', media: images[val],
                caption: `✅ Bạn đang chọn ảnh số ${parseInt(val) + 1}/${images.length}${SIGNATURE}`,
                parse_mode: 'Markdown'
            }, { chat_id: query.message.chat.id, message_id: query.message.message_id, reply_markup: query.message.reply_markup });
        } else if (action === 'page') { // Chuyển trang
            const page = parseInt(val);
            await bot.editMessageCaption(`📸 Bộ ảnh có **${images.length} tấm**.\nĐang hiển thị trang ${page + 1} (Ảnh ${page * 10 + 1}-${Math.min((page + 1) * 10, images.length)}).${SIGNATURE}`, {
                chat_id: query.message.chat.id, message_id: query.message.message_id,
                reply_markup: createPhotoKeyboard(storeId, images.length, page),
                parse_mode: 'Markdown'
            });
        } else if (action === 'all') { // Tải tất cả
            await bot.answerCallbackQuery(query.id, { text: "🚀 Đang gửi toàn bộ ảnh..." });
            const mediaGroup = images.map(img => ({ type: 'photo', media: img }));
            for (let i = 0; i < mediaGroup.length; i += 10) await bot.sendMediaGroup(query.message.chat.id, mediaGroup.slice(i, i + 10));
        }
    } catch (e) { console.log(e); }
    bot.answerCallbackQuery(query.id);
});

// Giữ nguyên các phần /start, /tt, /dl như cũ...
bot.onText(/\/start/, (msg) => {
    const startMsg = `🐄 **BOT TIKTOK BY CON BÒ** 🐄\n\n` +
        `*"Cỏ xanh là của đồng hoang, TikTok chất lượng là vàng của tớ!"*\n\n` +
        `Chào bạn nhé! Tớ là trợ lý **Con Bò**. Thay vì kêu "ùm bò" vô nghĩa, tớ ở đây để giúp bạn "vắt" sạch dữ liệu TikTok với tốc độ tên lửa.\n\n` +
        `📥 **Tớ Có Thể Giúp Gì Cho Bạn?**\n` +
        `🔹 **Tra cứu Profile:** Gõ \`/tt [username]\`\n` +
        `🔹 **Tải Video:** Gõ \`/dl [link]\`\n` +
        `🔹 **Lấy Slide ảnh:** Gõ \`/anh [link]\`\n\n` +
        `✨ **Mẹo Nhỏ:** Cứ dán thẳng cái link TikTok vào đây, tớ tự nhai luôn!${SIGNATURE}`;
    bot.sendMessage(msg.chat.id, startMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/dl (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'dl'));
bot.onText(/\/anh (.+)/, (msg, match) => handleTikTok(msg.chat.id, match[1].trim(), msg.message_id, 'anh'));
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/') && msg.text.includes('tiktok.com')) {
        const link = msg.text.match(/(https?:\/\/[^\s]+)/g);
        if (link) handleTikTok(msg.chat.id, link[0], msg.message_id, 'auto');
    }
});
