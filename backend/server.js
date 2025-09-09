const express = require("express");
const bodyParser = require("body-parser");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

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

    // 取得使用者 IP
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 1️⃣ 發送 Telegram
    const tgMessage = `新訪客登入：\nEmail: ${email}\nIP: ${ip}\n瀏覽器: ${browser}\n作業系統: ${os}`;
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: tgMessage
    });

    // 2️⃣ 發送 Email
    await sendEmail(email, ip, browser, os);

    res.json({ status: "ok", email });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "登入驗證失敗" });
  }
});

async function sendEmail(to, ip, browser, os) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"測試網站" <${GMAIL_USER}>`,
    to,
    subject: "測試通知：登入資訊",
    text: `我們收到您的登入資訊（測試用途）：\nIP: ${ip}\n瀏覽器: ${browser}\n作業系統: ${os}`
  });

  console.log("📧 Email 已寄給:", to);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
