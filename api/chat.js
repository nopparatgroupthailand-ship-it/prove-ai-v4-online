import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ลองใช้ชื่อโมเดลแบบเต็มและมาตรฐาน
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-pro"];

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { message, context } = req.body;
        
        let reply = null;
        for (const modelName of MODELS_TO_TRY) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(`บริบท: ${context || ""}\nคำถาม: ${message}`);
                reply = (await result.response).text();
                if (reply) break;
            } catch (e) {
                console.error(`Error with ${modelName}:`, e.message);
            }
        }

        if (!reply) throw new Error("ไม่สามารถเชื่อมต่อโมเดลได้ โปรดตรวจสอบสิทธิ์ API Key");
        return res.status(200).json({ reply });
    } catch (err) {
        return res.status(500).json({ reply: "ข้อผิดพลาด: " + err.message });
    }
}
