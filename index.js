const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3204;

// ================= CONFIG =================
const TELEGRAM_TOKEN = '8658882580:AAGMfPdlZiWsVAcJ-wDhQfhzLZBoAT-V2Qg';
const ADMIN_ID = 7350953063; // Ganti dengan User ID Telegram Anda (Angka)
const LICENSE_FILE = path.join(__dirname, 'licenses.json');
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load Licenses
function getLicenses() {
    if (!fs.existsSync(LICENSE_FILE)) return [];
    return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
}

function saveLicenses(licenses) {
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenses, null, 2));
}

// Telegram Bot Setup
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Halo! Saya adalah bot pengelola lisensi. Hanya admin yang dapat menggunakan perintah di sini.");
});

bot.onText(/\/genlicense/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ Akses ditolak. Anda bukan admin.");
    }
    const newLicense = 'PREM-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const licenses = getLicenses();
    licenses.push(newLicense);
    saveLicenses(licenses);
    bot.sendMessage(msg.chat.id, `✅ Lisensi Premium Berhasil Dibuat!\n\nLisensi: \`${newLicense}\``, { parse_mode: 'Markdown' });
});

bot.onText(/\/listlicense/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    const licenses = getLicenses();
    const text = licenses.length > 0 ? licenses.join('\n') : "Tidak ada lisensi.";
    bot.sendMessage(msg.chat.id, `📋 Daftar Lisensi:\n${text}`);
});

// API Routes
app.post('/api/verify', (req, res) => {
    const { license } = req.body;
    const licenses = getLicenses();
    if (licenses.includes(license)) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

app.post('/api/chat', async (req, res) => {
    const { prompt, license } = req.body;
    const licenses = getLicenses();
    
    if (!licenses.includes(license)) {
        return res.status(403).json({ error: "Lisensi tidak valid atau telah kadaluarsa." });
    }

    try {
        const apiUrl = `https://api-nanzz.my.id/docs/api/ai/unlimited-ai.php?prompt=${encodeURIComponent(prompt)}&model=chat-model-reasoning`;
        const response = await axios.get(apiUrl);
        
        // Menyesuaikan struktur response dari API sumber
        let reply = response.data;
        if (typeof reply === 'object' && reply.result) {
            reply = reply.result;
        } else if (typeof reply === 'object' && reply.data) {
            reply = reply.data;
        } else if (typeof reply === 'object') {
            reply = JSON.stringify(reply);
        }

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan pada server AI." });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Telegram Bot aktif!`);
});
