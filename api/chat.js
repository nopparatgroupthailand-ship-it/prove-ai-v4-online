import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MODEL (STABLE)
========================= */
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   RAG ENGINE (IMPROVED)
========================= */
function searchContext(question, text) {

    if (!text) return "";

    const chunks = text.split(/\n\s*\n/);

    const qWords = question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);

    const scored = chunks.map(chunk => {

        const lower = chunk.toLowerCase();

        let score = 0;

        qWords.forEach(w => {
            if (lower.includes(w)) score++;
        });

        return { chunk, score };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .filter(x => x.score > 0)
        .slice(0, 5)
        .map(x => x.chunk)
        .join("\n\n");
}

/* =========================
   API HANDLER
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

        /* =========================
           STRICT PROMPT (FIXED RAG BEHAVIOR)
        ========================= */
        const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย (e-GP / TOR / จัดซื้อจัดจ้าง)

กฎสำคัญ:
1. ต้องใช้ "เอกสาร" เป็นหลักก่อนเสมอ
2. ห้ามเดา ถ้ามีข้อมูลในเอกสาร
3. ถ้าไม่มีข้อมูล → ใช้ พ.ร.บ.จัดซื้อจัดจ้าง 2560 + ระเบียบกระทรวงการคลัง
4. ต้องตอบแบบเจ้าหน้าที่พัสดุใช้งานจริง

รูปแบบคำตอบ:
- สรุป
- วิเคราะห์ตามกฎหมาย
- ข้อเสนอแนะเชิงปฏิบัติ

เอกสารที่พบ:
${ragContext || "ไม่มีข้อมูลจากเอกสาร"}

คำถาม:
${message}
`;

        let reply = "";

        /* =========================
           MODEL ROTATION SAFE
        ========================= */
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

                if (text && text.length > 10) {
                    reply = text;
                    break;
                }

            } catch (err) {
                console.log("MODEL FAIL:", modelName);
            }
        }

        /* =========================
           FALLBACK
        ========================= */
        if (!reply) {
            reply = `
⚠️ AI ไม่สามารถตอบได้ในขณะนี้

สาเหตุ:
- quota หมด
- หรือ model ไม่พร้อมใช้งาน

กรุณาลองใหม่อีกครั้ง
`;
        }

        return res.status(200).json({ reply });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "SERVER ERROR"
        });
    }
}
