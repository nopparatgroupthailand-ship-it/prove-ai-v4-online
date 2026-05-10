import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   RAG (ไม่บังคับ)
========================= */
function searchContext(question, text) {

    if (!text) return "";

    const chunks = text.split(/\n\s*\n/);

    const words = question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);

    return chunks
        .filter(c =>
            words.some(w =>
                c.toLowerCase().includes(w)
            )
        )
        .slice(0, 5)
        .join("\n\n");
}

/* =========================
   MODEL CALL
========================= */
async function callModel(modelName, prompt) {

    const model = genAI.getGenerativeModel({
        model: modelName
    });

    const result = await model.generateContent(prompt);

    const text = result?.response?.text?.();

    if (!text) throw new Error("empty");

    return text;
}

/* =========================
   MAIN
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

        /* 🔥 FIX: prompt แบบ “ไม่บังคับเดา” */
        const prompt = `
คุณคือผู้เชี่ยวชาญด้านพัสดุภาครัฐไทย

ให้ตอบตามความรู้จริงจาก:
- พ.ร.บ.จัดซื้อจัดจ้าง พ.ศ. 2560
- ระเบียบกระทรวงการคลัง
- แนวทาง e-GP

หลักการตอบ:
- ถ้ามีข้อมูลจากเอกสาร ให้ใช้เอกสารก่อน
- ถ้าไม่มี ให้ใช้ความรู้กฎหมายจริงของคุณตอบได้เลย
- ห้ามเดาเลขมาตราแบบมั่ว

รูปแบบ:
1. คำตอบ
2. อธิบายเชิงกฎหมาย
3. แนวทางปฏิบัติ

เอกสาร:
${ragContext || "ไม่มีเอกสารแนบ"}

คำถาม:
${message}
`;

        let reply = "";

        for (const modelName of MODELS) {
            try {
                reply = await callModel(modelName, prompt);
                break;
            } catch (e) {
                console.log("FAIL:", modelName);
            }
        }

        if (!reply) {
            return res.status(200).json({
                reply: "AI ไม่พร้อมใช้งาน กรุณาลองใหม่"
            });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            reply: "ระบบขัดข้อง แต่สามารถลองใหม่ได้"
        });
    }
}
