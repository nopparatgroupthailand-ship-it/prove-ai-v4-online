import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   RAG (STABLE)
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
        .slice(0, 5)
        .map(x => x.chunk)
        .join("\n\n");
}

/* =========================
   SAFE CALL (WITH RETRY)
========================= */
async function callModel(modelName, prompt) {

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
        }
    });

    const result = await model.generateContent(prompt);
    return result?.response?.text?.();
}

/* =========================
   MAIN ENGINE (ROBUST)
========================= */
async function generateAI(prompt) {

    let lastError = null;

    for (const modelName of MODELS) {

        for (let attempt = 0; attempt < 2; attempt++) {

            try {

                const text = await callModel(modelName, prompt);

                if (text && text.trim().length > 10) {
                    return text;
                }

            } catch (err) {

                lastError = err;

                console.log(
                    `FAIL ${modelName} attempt ${attempt + 1}`,
                    err.message
                );

                await new Promise(r => setTimeout(r, 300)); // กัน burst

            }
        }
    }

    throw lastError || new Error("ALL MODELS FAILED");
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
คุณคือ AI ด้านพัสดุภาครัฐไทย

ต้องตอบตาม:
- พ.ร.บ. 2560
- ระเบียบกระทรวงการคลัง
- e-GP

ห้ามตอบว่า "ไม่มีข้อมูล"
ต้องพยายามวิเคราะห์จากความรู้กฎหมายเสมอ

เอกสาร:
${ragContext || "ไม่มีข้อมูลเอกสาร"}

คำถาม:
${message}
`;

        let reply;

        try {

            reply = await generateAI(prompt);

        } catch (err) {

            console.error("AI HARD FAIL:", err);

            return res.status(200).json({
                reply: `
⚠️ ระบบ AI ไม่พร้อมชั่วคราว

แต่ยังสามารถให้คำแนะนำพื้นฐานได้:

👉 ตาม พ.ร.บ.จัดซื้อจัดจ้าง 2560
👉 มาตรา 20 เป็นหลักเกี่ยวกับการบริหารสัญญา/ขั้นตอนควบคุมงาน (เชิงหลักการ)

กรุณาลองใหม่อีกครั้งใน 1-2 นาที
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
