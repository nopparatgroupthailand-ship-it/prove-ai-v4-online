/* ==========================================================
   PROVE AI - FIXED STABLE HANDLER
   รองรับ Gemini API รุ่นใหม่บน Vercel
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

    // อนุญาตเฉพาะ POST
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // ======================================================
        // 1. ตรวจสอบ API KEY
        // ======================================================
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                reply: "ไม่พบ GEMINI_API_KEY ใน Vercel Environment Variables"
            });
        }

        // ======================================================
        // 2. รับข้อมูลจาก Frontend
        // ======================================================
        const { message, context } = req.body || {};

        if (!message) {
            return res.status(400).json({
                reply: "ไม่มีข้อความที่ส่งมา"
            });
        }

        // ======================================================
        // 3. เชื่อม Gemini
        // ======================================================
        const genAI = new GoogleGenerativeAI(apiKey);

        // ใช้ model ใหม่ที่เสถียรกว่า
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest"
        });

        // ======================================================
        // 4. Prompt
        // ======================================================
        const prompt = `
คุณคือผู้ช่วย AI ภาษาไทย

บริบท:
${context || "ไม่มี"}

คำถาม:
${message}
`;

        // ======================================================
        // 5. Generate
        // ======================================================
        const result = await model.generateContent(prompt);

        const response = result.response.text();

        // ======================================================
        // 6. ส่งกลับ
        // ======================================================
        return res.status(200).json({
            reply: response
        });

    } catch (err) {

        console.error("GEMINI ERROR:", err);

        return res.status(500).json({
            reply: "ระบบ AI ขัดข้อง",
            error: err.message
        });
    }
}
