import { GoogleGenerativeAI }
from "@google/generative-ai";

import fs from "fs";
import path from "path";

const genAI =
 new GoogleGenerativeAI(
   process.env.GEMINI_API_KEY
 );

const model =
 genAI.getGenerativeModel({
   model: "gemini-2.5-flash"
 });

function searchContext(question) {

    try {

        const filePath =
         path.join(
            process.cwd(),
            "data",
            "knowledge.txt"
         );

        const text =
         fs.readFileSync(
            filePath,
            "utf8"
         );

        // แบ่ง paragraph
        const chunks =
         text.split(/\n\s*\n/);

        // ค้น keyword
        const results =
         chunks.filter(chunk => {

            return question
                .toLowerCase()
                .split(/\s+/)
                .some(word =>
                    chunk
                      .toLowerCase()
                      .includes(word)
                );

         });

        return results
            .slice(0, 5)
            .join("\n\n");

    } catch(err) {

        console.error(err);

        return "";

    }

}

export default async function handler(
    req,
    res
) {

    try {

        const {
            message
        } = req.body;

        const context =
         searchContext(message);

        const prompt = `
คุณคือผู้เชี่ยวชาญระเบียบพัสดุภาครัฐไทย

ตอบเฉพาะจากข้อมูลอ้างอิงเท่านั้น

ห้ามเดา
ห้ามแต่งข้อมูลเพิ่ม

หากไม่มีข้อมูลให้ตอบว่า:
"ไม่พบข้อมูลในเอกสาร"

ข้อมูลอ้างอิง:
${context}

คำถาม:
${message}
`;

        const result =
         await model.generateContent(
            prompt
         );

        const text =
         result.response.text();

        return res.status(200).json({
            reply: text
        });

    } catch(err) {

        console.error(err);

        return res.status(500).json({
            error: err.message
        });

    }

}
