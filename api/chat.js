import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MODEL LIST (REALISTIC)
========================= */
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   SAFE RAG
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
            words.some(w => c.toLowerCase().includes(w))
        )
        .slice(0, 5)
        .join("\n\n");
}

/* =========================
   SAFE CALL WITH TIMEOUT
========================= */
async function callModel(modelName, prompt) {
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 15000)
        )
    ]);

    const text = result?.response?.text?.();

    if (!text || text.length < 5) {
        throw new Error("empty response");
    }

    return text;
}

/* =========================
   MAIN HANDLER
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

ให้ตอบตาม:
- พ.ร.บ.จัดซื้อจัดจ้าง 2560
- ระเบียบกระทรวงการคลัง
- แนวทาง e-GP

ถ้าไม่มีข้อมูลในเอกสาร
ให้ใช้ความรู้กฎหมายไทยตอบได้ทันที

ต้องตอบแบบ:
- สรุป
- วิเคราะห์
- ข้อเสนอแนะ

ข้อมูลเอกสาร:
${ragContext || "ไม่มีข้อมูลเอกสาร"}

คำถาม:
${message}
`;

        let reply = null;

        /* =========================
           TRY MODELS LOOP
        ========================= */
        for (const modelName of MODELS) {
            try {
                console.log("TRY:", modelName);
                reply = await callModel(modelName, prompt);
                console.log("SUCCESS:", modelName);
                break;
            } catch (err) {
                console.log("FAIL:", modelName, err.message);
            }
        }

        /* =========================
           FINAL FALLBACK (IMPORTANT)
        ========================= */
        if (!reply) {

            // 🔥 fallback ไม่พังอีก
            reply = `
⚠️ ระบบ AI ไม่พร้อมใช้งานชั่วคราว

แต่สามารถอธิบายตามหลักกฎหมายได้:

👉 ตาม พ.ร.บ.จัดซื้อจัดจ้าง 2560
มาตรา ${message.includes("มาตรา") ? "ที่ถาม" : "ทั่วไป"} เป็นบทบัญญัติที่เกี่ยวกับหลักการบริหารงานพัสดุของรัฐ

📌 แนวทาง:
- ต้องโปร่งใส
- ตรวจสอบได้
- แข่งขันเสรี
- คุ้มค่าเงินรัฐ

กรุณาลองใหม่อีกครั้งใน 1-2 นาที
`;
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error("SERVER ERROR:", err);

        return res.status(500).json({
            reply: "⚠️ ระบบ AI ขัดข้อง กรุณาลองใหม่"
        });
    }
}
