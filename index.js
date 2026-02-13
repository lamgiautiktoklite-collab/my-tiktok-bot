const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// Tạo Web Server để Render không tắt bot
const app = express();
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(process.env.PORT || 3000);

const token = process.env.TELEGRAM_TOKEN; 
// Polling interval 1000ms để tránh lỗi 409 Conflict
const bot = new TelegramBot(token, { polling: { interval: 1000, autoStart: true } });

const ADMIN_ID = 5728554562; 
let userList = new Set(); 

// Theo dõi người dùng
bot.on('message', (msg) => {
    if (msg.from && !msg.from.is_bot) userList.add(msg.from.id);
});

// Lệnh kiểm tra trạng thái Admin
bot.onText(/\/vps/, async (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;
    try {
        await bot.sendMessage(msg.chat.id, `📊 **THỐNG KÊ BOT**\n👥 Tổng người dùng: **${userList.size}**\n⚡ Trạng thái: **Đang chạy tốt**`);
    } catch (e) { console.error("Lỗi gửi tin vps"); }
});

// Lệnh tải video đa năng (Fix lỗi API bận)
bot.onText(/\/dl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let url = match[1].trim();
    const waitingMsg = await bot.sendMessage(chatId, "⏳ Đang kết nối server tải (Nguồn 1/3)...");

    // Danh sách các API dự phòng để không bị báo "Bận"
    const apiSources = [
        `https://api.vkrhost.com/api/download?url=${encodeURIComponent(url)}`,
        `https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`,
        `https://api.douyin.wtf/api?url=${encodeURIComponent(url)}`
    ];

    let success = false;

    for (let i = 0; i < apiSources.length; i++) {
        try {
            // Nếu nguồn 1 lỗi, thông báo chuyển nguồn
            if (i > 0) {
                await bot.editMessageText(`⚠️ Nguồn ${i} bận, đang thử Nguồn ${i+1}...`, {
                    chat_id: chatId,
                    message_id: waitingMsg.message_id
                }).catch(() => {});
            }

            const res = await axios.get(apiSources[i], { timeout: 15000 }); // Chờ tối đa 15s
            
            // Tìm link video trong cấu trúc dữ liệu khác nhau của các API
            const videoUrl = res.data.data?.url || res.data.url || res.data.data?.play || res.data.data?.download;

            if (videoUrl) {
                await bot.sendVideo(chatId, videoUrl, { 
                    caption: "✅ Tải thành công!",
                    reply_to_message_id: msg.message_id 
                });
                await bot.deleteMessage(chatId, waitingMsg.message_id).catch(() => {});
                success = true;
                break; // Thoát vòng lặp khi tải được
            }
        } catch (e) {
            console.log(`Nguồn ${i+1} gặp sự cố, thử nguồn tiếp theo...`);
        }
    }

    if (!success) {
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
