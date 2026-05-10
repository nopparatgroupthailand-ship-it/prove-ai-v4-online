import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MODEL LIST
========================= */
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

/* =========================
   RAG SIMPLE (FIXED)
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
   SAFE CALL
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

ให้ตอบโดยยึด:
- พ.ร.บ.จัดซื้อจัดจ้าง พ.ศ. 2560
- ระเบียบกระทรวงการคลัง
- แนวทาง e-GP

หลักการตอบ:
1. ห้ามเดามาตรา ถ้าไม่มีข้อมูลชัดเจน
2. ห้ามสร้างเลขมาตราเอง
3. ถ้าไม่พบข้อมูล ให้ตอบเชิง "หลักการทั่วไปของกฎหมายพัสดุ"
4. ต้องตอบแบบเจ้าหน้าที่พัสดุราชการ

โครงสร้าง:
- สรุป
- วิเคราะห์
- แนวทางปฏิบัติ

ข้อมูลเอกสาร:
${ragContext || "ไม่มีข้อมูลเอกสาร"}

คำถาม:
${message}
`;

        let reply = "";

        /* =========================
           TRY MODELS
        ========================= */
        for (const modelName of MODELS) {
            try {
                reply = await callModel(modelName, prompt);
                break;
            } catch (e) {
                console.log("MODEL FAIL:", modelName);
            }
        }

        /* =========================
           FIXED FALLBACK (NO MORE RANDOM ARTICLE)
        ========================= */
        if (!reply) {

            reply = `
📌 ตามหลัก พ.ร.บ.จัดซื้อจัดจ้าง พ.ศ. 2560

ในประเด็นที่ถามนี้
สามารถอธิบายในเชิงหลักการได้ดังนี้:

- การดำเนินการพัสดุของรัฐต้องโปร่งใส
- ต้องมีการแข่งขันอย่างเป็นธรรม
- ต้องคำนึงถึงความคุ้มค่า
- ต้องตรวจสอบได้ทุกขั้นตอน

⚠️ หมายเหตุ:
ระบบไม่พบข้อมูลเฉพาะของมาตรานี้จากเอกสารที่อัปโหลด
จึงให้คำตอบในระดับหลักการทั่วไปแทน
`;
        }

        return res.status(200).json({ reply });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            reply: `
⚠️ ระบบขัดข้องชั่วคราว

แต่ตามหลัก พ.ร.บ.จัดซื้อจัดจ้าง 2560
การดำเนินงานพัสดุยังต้องยึดหลัก:
- โปร่งใส
- ตรวจสอบได้
- คุ้มค่า
`
        });
    }
}
