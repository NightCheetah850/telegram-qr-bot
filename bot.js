const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Bot QR Code sedang berjalan...');

// Handler untuk perintah /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
🔄 *QR Code Generator Bot*

Kirim saya teks, URL, nomor telepon, atau informasi lainnya, dan saya akan mengubahnya menjadi QR Code untuk Anda!

✨ *Contoh penggunaan:*
• https://example.com
• Nomor telepon: +62123456789
• Teks biasa: Halo, dunia!

Bot siap menerima pesan Anda!
  `;
  
  bot.sendMessage(chatId, welcomeText, { 
    parse_mode: 'Markdown',
    reply_markup: {
      resize_keyboard: true,
      keyboard: [
        [{ text: 'Buat QR Code' }],
        [{ text: 'Bantuan' }]
      ]
    }
  });
});

// Handler untuk perintah /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📖 *Cara Menggunakan Bot QR Code*

1. *Kirim teks langsung* - Bot akan otomatis generate QR Code
2. *Kirim URL* - Pastikan format lengkap (https://...)
3. *Data lainnya* - Nomor telepon, email, teks biasa

📝 *Contoh format yang didukung:*
• URL: https://example.com
• Telepon: +62123456789  
• Email: contoh@email.com
• WiFi: WIFI:S:Network;T:WPA;P:Password;;
• Teks: Data apa saja

🛠 *Fitur:*
• QR Code otomatis dari pesan
• Download sebagai gambar
• Support berbagai format data
  `;
  
  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Handler untuk semua pesan teks
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  // Abaikan command dan pesan sistem
  if (userText.startsWith('/') || !userText.trim()) {
    return;
  }

  try {
    // Kirim pesan "sedang memproses"
    const processingMsg = await bot.sendMessage(chatId, '🔄 Sedang membuat QR Code...');

    // Generate QR Code sebagai buffer
    const qrBuffer = await QRCode.toBuffer(userText, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });

    // Hapus pesan "sedang memproses"
    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Kirim QR Code sebagai foto
    await bot.sendPhoto(chatId, qrBuffer, {
      caption: `📲 QR Code untuk:\n\`${userText}\``,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: '🔄 Buat Lagi', 
              callback_data: 'generate_again' 
            }
          ]
        ]
      }
    });

  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan saat membuat QR Code. Silakan coba lagi dengan teks yang berbeda.');
  }
});

// Handler untuk inline button
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  if (data === 'generate_again') {
    await bot.sendMessage(chatId, '🔄 Silakan kirim teks baru untuk membuat QR Code lagi...');
  }

  // Jawab callback query
  await bot.answerCallbackQuery(callbackQuery.id);
});

// Handler error polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

// Handler untuk graceful shutdown
process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());

console.log('✅ Bot berhasil diinisialisasi');
