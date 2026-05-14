/* ==========================================================
   PROVE AI - STABLE HANDLER
   ใช้การกำหนดค่ารุ่น API และ Model ให้ชัดเจนเพื่อหลีกเลี่ยง 404
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. ตรวจสอบ Method
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 2. ดึง API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("ไม่ได้ตั้งค่า GEMINI_API_KEY ใน Environment Variables");
        }

        // 3. เตรียมข้อมูลจาก Request
        const { message, context } = req.body || {};
        if (!message) return res.status(400).json({ error: "ไม่มีข้อความ" });

        // 4. เชื่อมต่อ Google Generative AI
        const genAI = new GoogleGenerativeAI(apiKey);

        // 5. เลือกใช้โมเดลและเวอร์ชันที่เสถียรที่สุด
        // การระบุ apiVersion: "v1beta" ช่วยลดปัญหา 404 ใน SDK รุ่นใหม่
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            apiVersion: "v1beta"
        });
        
        // 6. ส่งข้อความไปยัง AI
        const prompt = `บริบท: ${context || "ไม่มี"}\nคำถาม: ${message}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // 7. ส่งคำตอบกลับ
        return res.status(200).json({ reply: response.text() });

    } catch (err) {
        console.error("API Error Details:", err);
        return res.status(500).json({ 
            reply: `ระบบขัดข้อง: ${err.message}` 
        });
    }
}
