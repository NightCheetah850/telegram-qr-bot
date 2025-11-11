const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
const path = require('path');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { 
    polling: true,
    filepath: false
});

console.log('🤖 Bot QR Code + Inline Mode sedang berjalan...');

// Simpan riwayat pengguna untuk fitur "Buat Lagi"
const userHistory = new Map();

// ===== HANDLER UNTUK INLINE QUERY =====
bot.on('inline_query', async (inlineQuery) => {
    const query = inlineQuery.query;
    const userId = inlineQuery.from.id;

    try {
        if (!query) {
            // Jika query kosong, tampilkan contoh penggunaan
            return await bot.answerInlineQuery(inlineQuery.id, [
                {
                    type: 'article',
                    id: '1',
                    title: '📱 Buat Kode QR',
                    input_message_content: {
                        message_text: 'Ketik teks setelah username bot untuk membuat QR Code\nContoh: `@' + bot.options.username + ' https://contoh.com`',
                        parse_mode: 'Markdown'
                    },
                    description: 'Contoh: @' + bot.options.username + ' Hello World!',
                    thumb_url: 'https://cdn-icons-png.flaticon.com/512/1530/1530755.png'
                },
                {
                    type: 'article',
                    id: '2',
                    title: '🌐 Contoh URL',
                    input_message_content: {
                        message_text: 'https://github.com'
                    },
                    description: 'Gunakan untuk generate QR URL',
                    thumb_url: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
                }
            ], {
                cache_time: 1,
                is_personal: true
            });
        }

        // Generate QR code sebagai data URL
        const qrCodeDataUrl = await QRCode.toDataURL(query, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        // Konversi data URL ke buffer
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrCodeBuffer = Buffer.from(base64Data, 'base64');

        // Simpan riwayat untuk user
        if (!userHistory.has(userId)) {
            userHistory.set(userId, []);
        }
        userHistory.get(userId).unshift(query);
        
        // Batasi riwayat hingga 10 item
        if (userHistory.get(userId).length > 10) {
            userHistory.get(userId).pop();
        }

        // Kirim hasil inline query
        await bot.answerInlineQuery(inlineQuery.id, [
            {
                type: 'photo',
                id: query.substring(0, 64), // ID maksimal 64 karakter
                photo_url: qrCodeDataUrl,
                thumb_url: qrCodeDataUrl,
                caption: `📲 QR Code untuk: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`,
                title: `QR: ${query.substring(0, 30)}${query.length > 30 ? '...' : ''}`,
                description: `Klik untuk mengirim QR Code`
            }
        ], {
            cache_time: 0,
            is_personal: true
        });

    } catch (error) {
        console.error('Error generating inline QR:', error);
        
        // Fallback ke hasil teks jika error
        await bot.answerInlineQuery(inlineQuery.id, [
            {
                type: 'article',
                id: 'error',
                title: '❌ Error membuat QR Code',
                input_message_content: {
                    message_text: `Maaf, terjadi kesalahan saat membuat QR Code untuk "${query}".\nCoba dengan teks yang lebih pendek atau berbeda.`
                },
                description: 'Coba dengan teks yang lebih pendek'
            }
        ], {
            cache_time: 1
        });
    }
});

// ===== HANDLER UNTUK PEMANGGILAN INLINE RESULTS =====
bot.on('chosen_inline_result', (chosenResult) => {
    const userId = chosenResult.from.id;
    const query = chosenResult.query;
    
    console.log(`User ${userId} memilih inline result untuk: ${query}`);
});

// ===== HANDLER UNTUK COMMANDS =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `
🔄 *QR Code Generator Bot*

*Fitur Baru: Inline Mode!* ✨

Sekarang Anda bisa menggunakan bot ini di chat mana saja dengan mengetik:
\`@${bot.options.username} [teks-anda]\`

*Contoh penggunaan inline:*
• \`@${bot.options.username} https://contoh.com\`
• \`@${bot.options.username} Halo dunia!\`
• \`@${bot.options.username} +62123456789\`

*Fitur yang tersedia:*
✅ Generate QR Code dari teks/URL
✅ Mode inline (bisa digunakan di grup/channel)
✅ Riwayat pembuatan QR Code
✅ Support berbagai format data

*Command yang tersedia:*
/start - Memulai bot
/help - Bantuan penggunaan
/history - Lihat riwayat QR Code
/generate [teks] - Generate QR Code langsung
    `;
    
    bot.sendMessage(chatId, welcomeText, { 
        parse_mode: 'Markdown',
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{ text: '🎯 Coba Inline Mode' }, { text: '📖 Bantuan' }],
                [{ text: '🔄 Generate QR Code' }]
            ]
        }
    });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
📖 *Panduan Penggunaan Bot QR Code*

*Cara Menggunakan Inline Mode:*
1. Buka chat apa saja (grup/channel/pribadi)
2. Ketik: \`@${bot.options.username} [teks-anda]\`
3. Pilih hasil QR Code yang muncul

*Format yang Didukung:*
• 🌐 URL: https://example.com
• 📞 Telepon: +62123456789  
• 📧 Email: contoh@email.com
• 📍 Lokasi: geo:-6.200000,106.816666
• 📶 WiFi: WIFI:S:Network;T:WPA;P:Password;;
• 📝 Teks biasa: Data apa saja

*Command Lainnya:*
/generate [teks] - Generate QR Code langsung
/history - Lihat 5 riwayat terakhir
/help - Tampilkan pesan bantuan ini

*Contoh cepat:*
\`/generate Hello World!\`
    `;
    
    bot.sendMessage(chatId, helpText, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { 
                    text: '🎯 Coba Inline Mode Sekarang', 
                    switch_inline_query: 'https://github.com' 
                }
            ]]
        }
    });
});

bot.onText(/\/generate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userText = match[1];
    
    try {
        const processingMsg = await bot.sendMessage(chatId, '🔄 Sedang membuat QR Code...');
        
        const qrBuffer = await QRCode.toBuffer(userText, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        // Simpan riwayat
        const userId = msg.from.id;
        if (!userHistory.has(userId)) {
            userHistory.set(userId, []);
        }
        userHistory.get(userId).unshift(userText);
        if (userHistory.get(userId).length > 10) {
            userHistory.get(userId).pop();
        }

        await bot.sendPhoto(chatId, qrBuffer, {
            caption: `📲 QR Code untuk:\n\`${userText}\`\n\nScan dengan aplikasi QR scanner!`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '🔄 Buat Lagi', 
                            switch_inline_query: userText 
                        },
                        { 
                            text: '📱 Coba Inline', 
                            switch_inline_query: '' 
                        }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('Error:', error);
        await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan. Silakan coba lagi dengan teks yang berbeda.');
    }
});

bot.onText(/\/history/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const history = userHistory.get(userId);
    if (!history || history.length === 0) {
        return bot.sendMessage(chatId, '📝 Anda belum memiliki riwayat generate QR Code.');
    }
    
    const historyText = `📝 *Riwayat 5 QR Code Terakhir:*\n\n` +
        history.slice(0, 5).map((item, index) => 
            `${index + 1}. ${item.substring(0, 50)}${item.length > 50 ? '...' : ''}`
        ).join('\n') +
        `\n\nKlik item untuk generate ulang dengan inline mode.`;
    
    const inlineKeyboard = history.slice(0, 5).map((item, index) => [
        {
            text: `${index + 1}. ${item.substring(0, 30)}${item.length > 30 ? '...' : ''}`,
            switch_inline_query: item
        }
    ]);

    bot.sendMessage(chatId, historyText, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    });
});

// ===== HANDLER UNTUK PESAN BIASA =====
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userText = msg.text;
    const userId = msg.from.id;

    // Abaikan command dan pesan sistem
    if (userText.startsWith('/') || !userText.trim() || 
        userText === '🎯 Coba Inline Mode' || 
        userText === '📖 Bantuan' ||
        userText === '🔄 Generate QR Code') {
        
        if (userText === '🎯 Coba Inline Mode') {
            await bot.sendMessage(chatId, `🎯 *Cara menggunakan inline mode:*\n\n1. Buka chat mana saja\n2. Ketik: \\@${bot.options.username} [teks-anda]\n3. Pilih QR Code yang diinginkan\n\n*Contoh:* \\@${bot.options.username} Hello World!`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { 
                            text: '🚀 Coba Sekarang', 
                            switch_inline_query: 'https://example.com' 
                        }
                    ]]
                }
            });
        } else if (userText === '📖 Bantuan') {
            bot.emitText('/help', msg);
        } else if (userText === '🔄 Generate QR Code') {
            await bot.sendMessage(chatId, 'Kirimkan teks atau URL yang ingin dijadikan QR Code, atau gunakan command:\n\n`/generate [teks-anda]`\n\nContoh: `/generate https://google.com`', {
                parse_mode: 'Markdown'
            });
        }
        return;
    }

    try {
        const processingMsg = await bot.sendMessage(chatId, '🔄 Sedang membuat QR Code...');

        const qrBuffer = await QRCode.toBuffer(userText, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        });

        await bot.deleteMessage(chatId, processingMsg.message_id);

        // Simpan riwayat
        if (!userHistory.has(userId)) {
            userHistory.set(userId, []);
        }
        userHistory.get(userId).unshift(userText);
        if (userHistory.get(userId).length > 10) {
            userHistory.get(userId).pop();
        }

        await bot.sendPhoto(chatId, qrBuffer, {
            caption: `📲 QR Code untuk:\n\`${userText}\`\n\nScan dengan aplikasi QR scanner!`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '🔄 Buat Lagi', 
                            switch_inline_query: userText 
                        },
                        { 
                            text: '📱 Gunakan Inline', 
                            switch_inline_query: '' 
                        }
                    ],
                    [
                        {
                            text: '📝 Lihat Riwayat',
                            callback_data: 'show_history'
                        }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('Error:', error);
        await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan. Silakan coba lagi dengan teks yang berbeda.');
    }
});

// ===== HANDLER UNTUK CALLBACK QUERIES =====
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    if (data === 'show_history') {
        const history = userHistory.get(userId);
        if (!history || history.length === 0) {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Anda belum memiliki riwayat generate QR Code'
            });
            return;
        }

        const historyText = `📝 *Riwayat QR Code Terakhir:*\n\n` +
            history.slice(0, 3).map((item, index) => 
                `${index + 1}. ${item.substring(0, 40)}${item.length > 40 ? '...' : ''}`
            ).join('\n');

        await bot.editMessageCaption(historyText, {
            chat_id: chatId,
            message_id: message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...history.slice(0, 3).map((item, index) => [
                        {
                            text: `🔁 ${index + 1}. Generate Ulang`,
                            switch_inline_query: item
                        }
                    ]),
                    [{ text: '📱 Menu Utama', callback_data: 'main_menu' }]
                ]
            }
        });
        
        await bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'main_menu') {
        await bot.deleteMessage(chatId, message.message_id);
        bot.emitText('/start', { chat: { id: chatId }, from: callbackQuery.from });
    }
});

// ===== HANDLER ERROR =====
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
});

process.once('SIGINT', () => {
    console.log('Bot dimatikan dengan SIGINT');
    bot.stopPolling();
    process.exit();
});

process.once('SIGTERM', () => {
    console.log('Bot dimatikan dengan SIGTERM');
    bot.stopPolling();
    process.exit();
});

console.log('✅ Bot berhasil diinisialisasi dengan inline mode!');
console.log(`🤖 Username bot: @${bot.options.username}`);
