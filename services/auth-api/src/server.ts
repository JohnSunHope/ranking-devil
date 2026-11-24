import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { Firestore, Timestamp } from "@google-cloud/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";

const required = ["RESEND_API_KEY", "EMAIL_FROM", "CODE_PEPPER"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

if (!getApps().length) initializeApp();
const db = new Firestore();
const firebaseAuth = getAuth();
const resend = new Resend(process.env.RESEND_API_KEY);
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"], maxAge: 86400 }));
app.use(express.json({ limit: "8kb" }));

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type CodeRecord = {
  codeHash: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  attempts: number;
};

const normalizedEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const emailKey = (email: string) => crypto.createHash("sha256").update(email).digest("hex");
const codeHash = (email: string, code: string) =>
  crypto.createHash("sha256").update(`${email}:${code}:${process.env.CODE_PEPPER}`).digest("hex");

const sameHash = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

app.get("/health", (_request, response) => response.json({ ok: true }));

app.post("/auth/email/request-code", async (request, response, next) => {
  try {
    const email = normalizedEmail(request.body.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      response.status(400).json({ error: "请输入有效的邮箱地址。" });
      return;
    }

    const reference = db.collection("emailLoginCodes").doc(emailKey(email));
    const existing = (await reference.get()).data() as CodeRecord | undefined;
    const now = Date.now();
    if (existing && now - existing.createdAt.toMillis() < RESEND_WAIT_MS) {
      response.status(429).json({ error: "验证码已发送，请稍后再试。" });
      return;
    }

    const code = crypto.randomInt(100000, 1_000_000).toString();
    await reference.set({
      codeHash: codeHash(email, code),
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
      attempts: 0,
    } satisfies CodeRecord);

    const sent = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [email],
      subject: "你的 Ranking Devil 验证码",
      html: `<main style="font-family:Arial,sans-serif;background:#151319;color:#f7f4f1;padding:32px;border-radius:16px"><p style="color:#b9ff3d;font-weight:bold;letter-spacing:1px">RANKING DEVIL</p><h1 style="font-size:28px">你的验证码</h1><p style="font-size:38px;font-weight:800;letter-spacing:8px;color:#ff6686">${code}</p><p>10 分钟内有效。别把验证码给任何人。</p></main>`,
    });

    if (sent.error) throw new Error(sent.error.message);
    response.status(202).json({ ok: true, expiresInSeconds: CODE_TTL_MS / 1000 });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/email/verify-code", async (request, response, next) => {
  try {
    const email = normalizedEmail(request.body.email);
    const code = String(request.body.code ?? "").replace(/\D/g, "");
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
      response.status(400).json({ error: "邮箱或验证码格式不正确。" });
      return;
    }

    const reference = db.collection("emailLoginCodes").doc(emailKey(email));
    const snapshot = await reference.get();
    const record = snapshot.data() as CodeRecord | undefined;
    if (!record || record.expiresAt.toMillis() < Date.now()) {
      await reference.delete();
      response.status(400).json({ error: "验证码已过期，请重新获取。" });
      return;
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await reference.delete();
      response.status(429).json({ error: "尝试次数过多，请重新获取验证码。" });
      return;
    }
    if (!sameHash(record.codeHash, codeHash(email, code))) {
      await reference.update({ attempts: record.attempts + 1 });
      response.status(400).json({ error: "验证码不正确。" });
      return;
    }

    await reference.delete();
    let user;
    try {
      user = await firebaseAuth.getUserByEmail(email);
      if (!user.emailVerified) user = await firebaseAuth.updateUser(user.uid, { emailVerified: true });
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      user = await firebaseAuth.createUser({ email, emailVerified: true });
    }

    const customToken = await firebaseAuth.createCustomToken(user.uid);
    response.json({ customToken });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "暂时无法发送或验证验证码，请稍后再试。" });
});

app.listen(Number(process.env.PORT ?? 8080), () => console.log("ranking-devil auth API running"));
