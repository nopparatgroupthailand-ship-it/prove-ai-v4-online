import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // ==================================================
        // API KEY
        // ==================================================
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("ไม่พบ GEMINI_API_KEY");
        }

        // ==================================================
        // REQUEST BODY
        // ==================================================
        const { message, context } = req.body || {};

        if (!message) {
            return res.status(400).json({
                reply: "ไม่มีข้อความ"
            });
        }

        // ==================================================
        // GEMINI
        // ==================================================
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        // ==================================================
        // PROMPT
        // ==================================================
        const prompt = `
บริบท:
${context || "ไม่มี"}

คำถาม:
${message}
`;

        // ==================================================
        // GENERATE
        // ==================================================
        const result = await model.generateContent(prompt);

        const response = await result.response;

        const text = response.text();

        // ==================================================
        // RETURN
        // ==================================================
        return res.status(200).json({
            reply: text
        });

    } catch (err) {

        console.error("GEMINI ERROR:", err);

        return res.status(500).json({
            reply: "AI Error",
            error: err.message
        });
    }
}
