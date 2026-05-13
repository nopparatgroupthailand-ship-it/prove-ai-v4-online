/* ==========================================================
   PROVE AI - CHAT HANDLER (ES MODULE VERSION)
   รองรับการใช้งานบน Vercel โดยใช้ Gemini API
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ตรวจสอบ API Key จาก Environment Variables
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ใช้ gemini-pro ซึ่งเป็นโมเดลมาตรฐานที่รองรับการใช้งานผ่าน API ทั่วไป
const MODEL_NAME = "gemini-pro";

// ฟังก์ชันค้นหาข้อมูลที่เกี่ยวข้องจากไฟล์ที่อัปโหลด
function searchContext(question, text) {
    if (!text) return "";
    const chunks = text.split(/\n\s*\n/);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    // คัดกรองส่วนที่เกี่ยวข้องมา 5 ย่อหน้า
    return chunks.filter(c => words.some(w => c.toLowerCase().includes(w))).slice(0, 5).join("\n\n");
}

/* ฟังก์ชันเรียกใช้ Gemini API */
async function callGemini(prompt) {
    if (!genAI) throw new Error("API Key ไม่ได้ถูกตั้งค่า");
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/* MAIN HANDLER */
export default async function handler(req, res) {
    // ป้องกันการเรียกใช้ด้วย method อื่นที่ไม่ใช่ POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, context } = req.body || {};
        
        if (!message) {
            return res.status(400).json({ error: "ไม่มีข้อความคำถาม" });
        }

        // เตรียม Prompt
        const ragContext = searchContext(message, context || "");
        const prompt = `คุณคือผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย 
        หากข้อมูลในบริบทมีคำตอบ ให้ใช้ข้อมูลนั้นเป็นหลัก
        
        บริบทเอกสาร: ${ragContext || "ไม่มีเอกสารอัปโหลด"}
        
        คำถามของผู้ใช้: ${message}`;

        // เรียกใช้งาน Gemini
        const reply = await callGemini(prompt);

        return res.status(200).json({ reply });

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการประมวลผล:", err);
        return res.status(500).json({ 
            reply: "ขออภัย ระบบขัดข้อง: " + (err.message || "ไม่ทราบสาเหตุ") 
        });
    }
}
