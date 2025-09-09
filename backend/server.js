const express = require("express");
const bodyParser = require("body-parser");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;


const client = new OAuth2Client(GOOGLE_CLIENT_ID);


app.post("/google-login", async (req, res) => {
try {
const token = req.body.credential;
const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
const payload = ticket.getPayload();
const email = payload.email;


await sendEmail(email);
await notifyTelegram(email);


res.json({ email });
} catch (err) {
console.error("登入失敗:", err.message);
res.status(401).json({ error: "登入驗證失敗" });
}
});


async function sendEmail(to) {
let transporter = nodemailer.createTransport({
service: "gmail",
auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});


await transporter.sendMail({
from: `\"我的網站\" <${GMAIL_USER}>`,
to,
subject: "歡迎來訪 🎉",
text: "感謝使用 Google 登入！這是一封測試郵件 🚀"
});


console.log("📧 Email 已寄出給:", to);
}


async function notifyTelegram(email) {
const message = `🆕 有人用 Google 登入！\n📧 Email: ${email}`;


await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
chat_id: TELEGRAM_CHAT_ID,
text: message
});


console.log("🤖 Telegram 已通知:", email);
}


app.listen(10000, () => console.log("Server running on http://localhost:10000"));