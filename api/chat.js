import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MODEL (SAFE LIST)
========================= */
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   SIMPLE RAG (FIXED)
========================= */
function searchContext(question, text) {

    if (!text) return "";

    const chunks = text.split(/\n\s*\n/);

    const qWords = question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2); // กัน noise

    return chunks
        .filter(chunk =>
            qWords.some(w =>
                chunk.toLowerCase().includes(w)
            )
        )
        .slice(0, 5)
        .join("\n\n");
}

/* =========================
   HANDLER
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
คุณคือ AI ผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย

ต้องตอบอิง:
- พ.ร.บ.จัดซื้อจัดจ้าง พ.ศ. 2560
- ระเบียบกระทรวงการคลัง
- แนวทาง e-GP

รูปแบบ:
- สรุป
- วิเคราะห์
- ข้อเสนอแนะ

ถ้าไม่มีข้อมูลในเอกสาร:
ให้ใช้ความรู้กฎหมายไทยตอบได้

ข้อมูลเอกสาร:
${ragContext || "ไม่มีข้อมูลเอกสาร"}

คำถาม:
${message}
`;

        let reply = "";

        for (const modelName of MODELS) {

            try {

                const model = genAI.getGenerativeModel({
                    model: modelName
                });

                const result = await model.generateContent(prompt);

                const text = result?.response?.text?.();

                if (text) {
                    reply = text;
                    break;
                }

            } catch (err) {
                console.log("MODEL FAIL:", modelName);
            }
        }

        if (!reply) {
            reply = "⚠️ AI ไม่พร้อมใช้งาน กรุณาลองใหม่";
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "SERVER ERROR"
        });
    }
}
