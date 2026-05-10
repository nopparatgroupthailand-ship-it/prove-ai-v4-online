import { GoogleGenerativeAI }
from "@google/generative-ai";

export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    try {

        const {
            message,
            context
        } = req.body;
console.log("KEY:", process.env.GEMINI_API_KEY);
        const genAI =
            new GoogleGenerativeAI(
                process.env.GEMINI_API_KEY
            );

        const model =
            genAI.getGenerativeModel({
                model: "gemini-2.0-flash-lite"
            });

        const prompt = `
ข้อมูลอ้างอิง:
${context || "ไม่มี"}

คำถาม:
${message}
`;

        const result =
            await model.generateContent(prompt);

        const text =
            result.response.text();

        return res.status(200).json({
            reply: text
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: err.message
        });
    }
}
