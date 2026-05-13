/* ==========================================================
   PROVE AI - SDK MANAGED HANDLER
   ใช้ SDK จัดการ Endpoint ให้อัตโนมัติ ไม่ระบุ v1beta เอง
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ดึง API Key
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// เลือกใช้โมเดลที่แนะนำ (แนะนำให้ลอง gemini-1.5-flash เป็นอันดับแรก)
const MODEL_NAME = "gemini-1.5-flash";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, context } = req.body || {};
        
        if (!message) return res.status(400).json({ error: "ไม่มีข้อความ" });
        if (!genAI) throw new Error("API Key ไม่ได้ตั้งค่าในระบบ");

        // ให้ SDK จัดการการเชื่อมต่อให้โดยอัตโนมัติ
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const prompt = `บริบท: ${context || "ไม่มี"}\nคำถาม: ${message}`;
        
        // เรียกใช้ generateContent
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
