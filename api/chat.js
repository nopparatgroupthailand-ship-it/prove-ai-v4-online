/* ==========================================================
   PROVE AI - CHAT HANDLER (WITH FALLBACK STRATEGY)
   ระบบจะพยายามเรียกโมเดลตามลำดับที่กำหนด หากตัวแรกพังจะลองตัวถัดไป
========================================================== */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// รายชื่อโมเดลที่ต้องการให้ระบบลองสับเปลี่ยน (เรียงลำดับความสำคัญ)
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

function searchContext(question, text) {
    if (!text) return "";
    const chunks = text.split(/\n\s*\n/);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return chunks.filter(c => words.some(w => c.toLowerCase().includes(w))).slice(0, 5).join("\n\n");
}

/* ฟังก์ชันเรียกใช้ Gemini API พร้อม Fallback */
async function callGeminiWithFallback(prompt) {
    if (!genAI) throw new Error("API Key ไม่ได้ถูกตั้งค่า");
    
    let lastError = "";

    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text(); // ถ้าสำเร็จให้คืนค่าทันที
        } catch (err) {
            console.error(`โมเดล ${modelName} ใช้งานไม่ได้:`, err.message);
            lastError = err.message;
            continue; // ถ้าตัวนี้พัง ให้ไปลองตัวถัดไปในลูป
        }
    }

    throw new Error(`ทุกโมเดลล้มเหลว (ข้อผิดพลาดสุดท้าย: ${lastError})`);
}

/* MAIN HANDLER */
export default async function handler(req, res) {
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

        // เรียกใช้งานระบบ Fallback
        const reply = await callGeminiWithFallback(prompt);

        return res.status(200).json({ reply });

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการประมวลผล:", err);
        return res.status(500).json({ 
            reply: "ขออภัย ระบบขัดข้อง: " + (err.message || "ไม่ทราบสาเหตุ") 
        });
    }
}
