/* =========================
   LOCAL OLLAMA + GEMINI BACKUP
   รองรับการเปลี่ยน URL ปลายทางผ่าน Request
========================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// ตั้งค่าโมเดล
const LOCAL_MODEL = "qwen2.5:7b"; 
const CLOUD_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

function searchContext(question, text) {
    if (!text) return "";
    const chunks = text.split(/\n\s*\n/);
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return chunks.filter(c => words.some(w => c.toLowerCase().includes(w))).slice(0, 5).join("\n\n");
}

/* 1. เรียกใช้ Ollama (ปรับให้รับ ollamaUrl ได้) */
async function callOllama(ollamaUrl, prompt) {
    // ถ้าไม่มีการระบุ URL มา ให้ค่าเริ่มต้นเป็น localhost:11434
    const targetUrl = ollamaUrl || 'http://localhost:11434';
    
    const response = await fetch(`${targetUrl}/api/generate`, {
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
        // รับค่า ollamaUrl ที่ส่งมาจากหน้าเว็บผ่าน request body
        const { message, context, ollamaUrl } = req.body || {};
        if (!message) return res.status(400).json({ error: "No message" });

        const ragContext = searchContext(message, context || "");
        const prompt = `คุณคือผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย Context: ${ragContext}\n\nคำถาม: ${message}`;

        let reply = "";

        // ลำดับการเรียก: 1. พยายามใช้ Ollama ตาม URL ที่ระบุ
        try {
            console.log("Trying Ollama at:", ollamaUrl || "localhost");
            reply = await callOllama(ollamaUrl, prompt);
        } catch (e) {
            console.log("Ollama Fail, trying Gemini...", e.message);
            
            // 2. ถ้า Ollama พัง ให้ไปเรียก Gemini
            for (const modelName of CLOUD_MODELS) {
                try {
                    reply = await callGemini(modelName, prompt);
                    if (reply) break;
                } catch (err) {
                    console.log("FAIL cloud model:", modelName);
                }
            }
        }

        if (!reply) {
            return res.status(200).json({ reply: "AI ไม่พร้อมใช้งานทั้งในเครื่องและระบบคลาวด์" });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ reply: "ระบบขัดข้องภายใน" });
    }
}
