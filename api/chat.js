/* ==========================================================
   PROVE AI - STABLE API HANDLER
   เวอร์ชันนี้เน้นความเสถียรและหลีกเลี่ยงข้อผิดพลาด 404
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. ดึง API Key
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 2. ใช้ gemini-pro (โมเดลมาตรฐานที่เสถียรที่สุดสำหรับ API Key ทั่วไป)
const MODEL_NAME = "gemini-pro";

/* MAIN HANDLER */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { message, context } = req.body || {};
        if (!message) return res.status(400).json({ error: "ไม่มีข้อความ" });
        if (!genAI) throw new Error("ไม่ได้ตั้งค่า API Key ในระบบ");

        // 3. เรียกใช้ Gemini
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        // 4. ส่ง Prompt แบบง่าย
        const prompt = `บริบท: ${context || "ไม่มี"}\nคำถาม: ${message}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return res.status(200).json({ reply: response.text() });

    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({ 
            reply: `ระบบขัดข้อง: ${err.message}` 
        });
    }
}
