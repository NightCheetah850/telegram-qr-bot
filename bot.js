const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// Token dari environment variable (akan diatur di hosting)
const token = process.env.TELEGRAM_BOT_TOKEN;

// Buat instance bot
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Bot QR Code sedang berjalan...');

// Handler untuk command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
🔄 *QR Code Generator Bot*

Kirim saya teks, URL, nomor telepon, atau informasi lainnya, dan saya akan mengubahnya menjadi QR Code!

✨ *Contoh penggunaan:*
• https://example.com
• +62123456789
• Halo, dunia!
• contoh@email.com

Coba kirim pesan teks sekarang! 🎯
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

// Handler untuk command /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📖 *Cara Menggunakan:*

1. *Kirim teks langsung* - Bot akan otomatis generate QR Code
2. *Kirim URL* - Format lengkap (https://...)
3. *Data lainnya* - Nomor telepon, email, teks biasa

📝 *Format yang didukung:*
• URL: https://example.com
• Telepon: +62123456789  
• Email: contoh@email.com
• WiFi: WIFI:S:Network;T:WPA;P:Password;;
• Teks biasa

Bot siap menerima pesan Anda! 🚀
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

    // Generate QR Code
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
      caption: `📲 QR Code untuk:\n\`${userText}\`\n\nScan dengan aplikasi QR scanner!`,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, '❌ Maaf, terjadi kesalahan. Silakan coba lagi dengan teks yang berbeda.');
  }
});

// Handler error
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Bot berhasil diinisialisasi dan siap menerima pesan!'); 
