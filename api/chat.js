/* =========================
   PROVE AI - GEMINI CLOUD VERSION
   เน้นความเสถียรบน Vercel (Cloud Only)
========================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ตรวจสอบ API Key
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ตั้งค่าโมเดลที่ต้องการใช้
const CLOUD_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

function searchContext(question, text) {
    if (!text) return "";
    const chunks = text.split(/\n\s*\n/);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return chunks.filter(c => words.some(w => c.toLowerCase().includes(w))).slice(0, 5).join("\n\n");
}

/* เรียกใช้ Gemini API */
async function callGemini(modelName, prompt) {
    if (!genAI) throw new Error("No API Key configured");
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result?.response?.text?.();
}

/* =========================
   MAIN HANDLER
========================= */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { message, context } = req.body || {};
        if (!message) return res.status(400).json({ error: "No message" });

        const ragContext = searchContext(message, context || "");
        const prompt = `คุณคือผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย 
        บริบทเอกสาร: ${ragContext}
        
        คำถาม: ${message}`;

        let reply = "";

        // เรียกใช้งาน Gemini โดยตรง
        for (const modelName of CLOUD_MODELS) {
            try {
                console.log("Calling Gemini model:", modelName);
                reply = await callGemini(modelName, prompt);
                if (reply) break;
            } catch (err) {
                console.error("Error calling", modelName, ":", err.message);
            }
        }

        if (!reply) {
            return res.status(200).json({ reply: "ขออภัย AI ไม่สามารถประมวลผลได้ในขณะนี้" });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error("Global Error:", err);
        return res.status(500).json({ reply: "ระบบขัดข้อง กรุณาตรวจสอบ API Key ใน Environment Variables" });
    }
}
