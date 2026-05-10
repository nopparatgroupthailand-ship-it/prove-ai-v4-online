import { GoogleGenerativeAI }
from "@google/generative-ai";

const genAI =
 new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

/* MODEL ROTATION */

const MODELS = [

    "gemini-2.0-flash-lite",

    "gemini-2.0-flash",

    "gemini-2.5-flash-lite",

    "gemini-flash-latest"

];

/* SIMPLE RAG */

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

1. ใช้ข้อมูลจากเอกสารก่อน
2. อ้างอิง:
- พ.ร.บ.จัดซื้อจัดจ้าง 2560
- ระเบียบกระทรวงการคลัง
- หนังสือเวียน

3. ถ้าเป็นความเห็นทั่วไป
ให้แจ้งว่า:
"คำตอบนี้เป็นคำแนะนำทั่วไป"

ข้อมูลเอกสาร:
${ragContext || 'ไม่มี'}

คำถาม:
${message}
`;

        let reply = '';

        /* AUTO MODEL SWITCH */

        for(
            const modelName
            of MODELS
        ){

            try{

                console.log(
                    'TRY MODEL:',
                    modelName
                );

                const model =
                 genAI.getGenerativeModel({
                    model:modelName
                 });

                const result =
                 await model.generateContent(
                    prompt
                 );

                reply =
                 result.response.text();

                console.log(
                    'SUCCESS:',
                    modelName
                );

                break;

            }catch(err){

                console.log(
                    'FAILED:',
                    modelName
                );

            }

        }

        /* FALLBACK */

        if(!reply){

            reply = `
AI ใช้งานเกิน quota ฟรีชั่วคราว

กรุณารอประมาณ 1 นาที
แล้วลองใหม่อีกครั้ง
`;

        }

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
