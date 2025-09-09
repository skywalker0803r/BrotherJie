const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ✅ 只允許你的前端網址跨域
app.use(cors({
  origin: "https://brotherjie.onrender.com" 
}));

// 環境變數
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google 登入 API
app.post("/google-login", async (req, res) => {
  try {
    const { credential, browser, os } = req.body;

    // 驗證 Google 登入 token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    // ✅ 只取第一個外網 IP
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip.includes(",")) ip = ip.split(",")[0].trim();

    // 1️⃣ 發送 Telegram
    const tgMessage = `🆕 新訪客登入：
    Email: ${email}
    IP: ${ip}
    瀏覽器: ${browser}
    作業系統: ${os}`;
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: tgMessage
    });

    // 2️⃣ 發送 Email
    await sendEmail(email, ip, browser, os);

    res.json({ status: "ok", email });
  } catch (err) {
    console.error("登入驗證失敗:", err);
    res.status(401).json({ error: "登入驗證失敗" });
  }
});

// 發送 Email
async function sendEmail(to, ip, browser, os) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"我知道你ip地址也知道你家在哪裡" <${GMAIL_USER}>`,
    to,
    subject: "你最好給我小心一點",
    text: `我知道你ip地址也知道你家在哪裡 你最好給我小心一點：
    IP: ${ip}
    瀏覽器: ${browser}
    作業系統: ${os}`
  });

  console.log("📧 Email 已寄給:", to);
}

// 監聽端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
