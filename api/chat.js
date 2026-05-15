import { GoogleGenerativeAI } from "@google/generative-ai";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {

    // ==================================================
    // CORS
    // ==================================================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // ==================================================
    // OPTIONS
    // ==================================================
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
        const { message, context } = req.body || {};

        console.log("BODY:", req.body);

        if (!message) {
            return res.status(400).json({
                error: "ไม่มีข้อความ"
            });
        }

        // ==================================================
        // GEMINI
        // ==================================================
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        console.log("MODEL READY");

        // ==================================================
        // ลด token
        // ==================================================
        const prompt = `
${context || ""}
${message}
`;

        let result;

        try {

            // ==================================================
            // TRY #1
            // ==================================================
            result = await model.generateContent(prompt);

        } catch (err) {

            console.log("FIRST ERROR:", err.message);

            // ==================================================
            // ถ้า quota minute เต็ม
            // ==================================================
            if (err.status === 429) {

                console.log("WAIT 8 SECONDS...");

                await sleep(8000);

                // ==================================================
                // TRY #2
                // ==================================================
                result = await model.generateContent(prompt);

            } else {

                throw err;
            }
        }

        // ==================================================
        // RESPONSE
        // ==================================================
        const text = result.response.text();

        console.log("SUCCESS");

        return res.status(200).json({
            success: true,
            reply: text
        });

    } catch (err) {

        console.error("=== FINAL ERROR ===");
        console.error(err);

        return res.status(500).json({
            success: false,
            error: err.message,
            status: err.status || 500
        });
    }
}
