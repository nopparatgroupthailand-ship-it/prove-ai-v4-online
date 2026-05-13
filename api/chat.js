/* =========================
   LOCAL OLLAMA + GEMINI BACKUP
========================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// ตั้งค่าโมเดลที่ต้องการใช้
const LOCAL_MODEL = "qwen2.5:7b"; 
const CLOUD_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

function searchContext(question, text) {
    if (!text) return "";
    const chunks = text.split(/\n\s*\n/);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return chunks.filter(c => words.some(w => c.toLowerCase().includes(w))).slice(0, 5).join("\n\n");
}

/* 1. เรียกใช้ Ollama ในเครื่อง */
async function callOllama(prompt) {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: LOCAL_MODEL,
            prompt: prompt,
            stream: false
        })
    });
    const data = await response.json();
    if (!data.response) throw new Error("Ollama failed");
    return data.response;
}

/* 2. เรียกใช้ Gemini API */
async function callGemini(modelName, prompt) {
    if (!genAI) throw new Error("No API Key");
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
        const prompt = `คุณคือผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย... (ปรับแต่ง Prompt ตามเดิมของคุณได้เลย)`;

        let reply = "";

        // ลำดับการเรียก: 1. พยายามใช้ Ollama ในเครื่องก่อน
        try {
            console.log("Trying Ollama...");
            reply = await callOllama(prompt);
        } catch (e) {
            console.log("Ollama Fail, trying Gemini...");
            
            // 2. ถ้า Ollama พัง ให้ไปเรียก Gemini
            for (const modelName of CLOUD_MODELS) {
                try {
                    reply = await callGemini(modelName, prompt);
                    if (reply) break;
                } catch (err) {
                    console.log("FAIL:", modelName);
                }
            }
        }

        if (!reply) {
            return res.status(200).json({ reply: "AI ไม่พร้อมใช้งานทั้งในเครื่องและระบบคลาวด์" });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ reply: "ระบบขัดข้อง" });
    }
}
