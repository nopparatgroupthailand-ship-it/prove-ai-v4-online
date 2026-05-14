/* ==========================================================
   PROVE AI - STABLE HANDLER (FORCE ENDPOINT)
   แก้ไขปัญหา 404 โดยการระบุ BaseURL และรุ่นของ API ให้ชัดเจน
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("ไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ");

        const { message, context } = req.body || {};
        if (!message) return res.status(400).json({ error: "ไม่มีข้อความ" });

        // สร้าง instance ของ GoogleGenerativeAI
        const genAI = new GoogleGenerativeAI(apiKey);

        // ระบุ model และ apiVersion ให้ชัดเจนเพื่อแก้ปัญหา 404
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            apiVersion: "v1beta" 
        });
        
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
