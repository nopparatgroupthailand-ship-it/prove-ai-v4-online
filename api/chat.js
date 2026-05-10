import { GoogleGenerativeAI }
from "@google/generative-ai";

const genAI =
 new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model =
 genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
});

/* SIMPLE RAG SEARCH */

function searchContext(
    question,
    text
){

    try{

        if(!text) return '';

        const chunks =
         text.split(/\n\s*\n/);

        const keywords =
         question
         .toLowerCase()
         .split(/\s+/);

        const results =
         chunks.filter(chunk=>{

            return keywords.some(word=>
                chunk
                .toLowerCase()
                .includes(word)
            );

         });

        return results
        .slice(0,5)
        .join('\n\n');

    }catch(err){

        return '';

    }

}

export default async function handler(
    req,
    res
){

    try{

        const {
            message,
            context
        } = req.body;

        const ragContext =
         searchContext(
            message,
            context
         );

        const prompt = `
คุณคือ AI ผู้เชี่ยวชาญ
ด้านระเบียบพัสดุภาครัฐไทย

แนวทางตอบ:

1. ให้ใช้อ้างอิงจาก:
- พระราชบัญญัติจัดซื้อจัดจ้างฯ พ.ศ.2560
- ระเบียบกระทรวงการคลัง
- หนังสือเวียนที่เกี่ยวข้อง

2. ถ้ามีข้อมูลจากเอกสารที่อัปโหลด
ให้ใช้อ้างอิงเอกสารนั้นเป็นหลัก

3. ถ้าไม่มีข้อมูลในเอกสาร
สามารถใช้ความรู้ทั่วไปด้านพัสดุภาครัฐตอบได้

4. ถ้าเป็นคำตอบทั่วไป
ให้แจ้งว่า:
"คำตอบนี้เป็นคำแนะนำทั่วไป"

ข้อมูลจากเอกสาร:
${ragContext || 'ไม่มีข้อมูลเอกสาร'}

คำถาม:
${message}
`;

        const result =
         await model.generateContent(
            prompt
         );

        const reply =
         result.response.text();

        return res.status(200).json({
            reply
        });

    }catch(err){

        console.error(err);

        return res.status(500).json({
            error: err.message
        });

    }

}
