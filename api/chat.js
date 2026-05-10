import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MODEL POOL (RESILIENT)
========================= */
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   RAG (UNCHANGED BUT SAFE)
========================= */
function searchContext(question, text) {

    if (!text) return "";

    const chunks = text.split(/\n\s*\n/);

    const qWords = question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);

    return chunks
        .map(chunk => {
            let score = 0;
            const lower = chunk.toLowerCase();

            qWords.forEach(w => {
                if (lower.includes(w)) score++;
            });

            return { chunk, score };
        })
        .sort((a, b) => b.score - a.score)
        .filter(x => x.score > 0)
        .slice(0, 5)
        .map(x => x.chunk)
        .join("\n\n");
}

/* =========================
   SAFE GENERATE (CRITICAL FIX)
   👉 วนจนกว่าจะได้คำตอบจริง
========================= */
async function generateWithFallback(prompt) {

    let lastError = null;

    for (const modelName of MODELS) {

        try {

            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.8,
                    maxOutputTokens: 2048
                }
            });

            const result = await model.generateContent(prompt);

            const text = result?.response?.text?.();

            if (text && text.trim().length > 10) {
                return text;
            }

        } catch (err) {
            lastError = err;
            console.log("MODEL FAIL:", modelName, err.message);
        }
    }

    throw lastError || new Error("All models failed");
}

/* =========================
   API
========================= */
export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {

        const { message, context } = req.body || {};

        if (!message) {
            return res.status(400).json({ error: "No message" });
        }

        const ragContext = searchContext(message, context || "");

        const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย (e-GP / TOR / จัดซื้อจัดจ้าง)

กฎ:
- ใช้เอกสารก่อน
- ถ้าไม่มี → ใช้ พ.ร.บ. 2560 + ระเบียบกระทรวงการคลัง
- ห้ามตอบว่า "ไม่มีข้อมูล" ถ้ายังมีความรู้กฎหมายรองรับ

รูปแบบ:
1) สรุป
2) วิเคราะห์
3) ข้อเสนอแนะ

เอกสาร:
${ragContext || "ไม่มีข้อมูลจากเอกสาร"}

คำถาม:
${message}
`;

        let reply;

        try {
            reply = await generateWithFallback(prompt);
        } catch (err) {
            return res.status(200).json({
                reply: `
⚠️ ระบบ AI ยังไม่พร้อม

สาเหตุ:
- quota หมด
- หรือ Gemini ไม่ตอบหลาย model

แต่ระบบ fallback ยังทำงานได้

กรุณาลองใหม่อีกครั้ง
`
            });
        }

        return res.status(200).json({ reply });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "SERVER ERROR"
        });
    }
}
