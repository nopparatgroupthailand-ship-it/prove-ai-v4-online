import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {

    // ==================================================
    // CORS
    // ==================================================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // รองรับ preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // ==================================================
    // METHOD CHECK
    // ==================================================
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        console.log("=== API START ===");

        // ==================================================
        // API KEY
        // ==================================================
        const apiKey = process.env.GEMINI_API_KEY;

        console.log("HAS API KEY:", !!apiKey);

        if (!apiKey) {
            throw new Error("ไม่พบ GEMINI_API_KEY");
        }

        // ==================================================
        // BODY
        // ==================================================
        console.log("BODY:", req.body);

        const { message, context } = req.body || {};

        if (!message) {
            return res.status(400).json({
                error: "ไม่มีข้อความ message"
            });
        }

        // ==================================================
        // GEMINI INIT
        // ==================================================
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log("GEN AI CREATED");

        // ==================================================
        // MODEL
        // ==================================================
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        console.log("MODEL CREATED");

        // ==================================================
        // PROMPT
        // ==================================================
        const prompt = `
บริบท:
${context || "ไม่มี"}

คำถาม:
${message}
`;

        console.log("PROMPT READY");

        // ==================================================
        // GENERATE
        // ==================================================
        const result = await model.generateContent(prompt);

        console.log("GENERATE SUCCESS");

        const response = result.response;

        const text = response.text();

        console.log("TEXT:", text);

        // ==================================================
        // SUCCESS
        // ==================================================
        return res.status(200).json({
            success: true,
            reply: text
        });

    } catch (err) {

        console.error("=== GEMINI ERROR ===");
        console.error(err);

        return res.status(500).json({
            success: false,
            error: err.message || "Unknown Error",
            details: String(err)
        });
    }
}
