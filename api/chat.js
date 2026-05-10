import { GoogleGenerativeAI }
from "@google/generative-ai";

const genAI =
 new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

/* =========================
   MODEL ROTATION
========================= */

const MODELS = [

    "gemini-2.0-flash-lite",

    "gemini-2.0-flash",

    "gemini-2.5-flash-lite",

    "gemini-flash-latest"

];

/* =========================
   SIMPLE RAG SEARCH
========================= */

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
         .split(/\s+/)
         .filter(Boolean);

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

        console.log(err);

        return '';

    }

}

/* =========================
   API
========================= */

export default async function handler(
    req,
    res
){

    try{

        /* METHOD */

        if(req.method !== 'POST'){

            return res.status(405).json({
                error:'Method not allowed'
            });

        }

        /* BODY */

        const {
            message,
            context
        } = req.body || {};

        if(!message){

            return res.status(400).json({
                error:'No message'
            });

        }

        /* SAFE CONTEXT */

        const safeContext =
         (context || '')
         .slice(0,50000);

        /* RAG */

        const ragContext =
         searchContext(
            message,
            safeContext
         );

        /* PROMPT */

        const prompt = `

คุณคือ AI ผู้เชี่ยวชาญ
ด้านระเบียบพัสดุภาครัฐไทย

แนวทางตอบ:

1. ใช้ข้อมูลจากเอกสารที่อัปโหลดก่อน

2. อ้างอิง:
- พ.ร.บ.จัดซื้อจัดจ้าง 2560
- ระเบียบกระทรวงการคลัง
- หนังสือเวียนกรมบัญชีกลาง

3. หากเอกสารไม่มีข้อมูล
ยังสามารถตอบจากกฎหมาย
และระเบียบพัสดุได้

4. ถ้าเป็นความเห็นทั่วไป
ให้แจ้งว่า:
"คำตอบนี้เป็นคำแนะนำทั่วไป"

5. ตอบให้เข้าใจง่าย
แบบเจ้าหน้าที่พัสดุภาครัฐ

ข้อมูลเอกสาร:
${ragContext || 'ไม่มีข้อมูลจากเอกสาร'}

คำถาม:
${message}

`;

        let reply = '';

        /* =========================
           AUTO MODEL SWITCH
        ========================= */

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

                console.log(
                    err.message
                );

            }

        }

        /* =========================
           FALLBACK
        ========================= */

        if(!reply){

            reply = `

AI ใช้งานเกิน quota ฟรี
หรือระบบ AI ไม่พร้อมใช้งานชั่วคราว

กรุณารอประมาณ 1 นาที
แล้วลองใหม่อีกครั้ง

`;

        }

        /* RESPONSE */

        return res.status(200).json({
            reply
        });

    }catch(err){

        console.error(err);

        return res.status(500).json({

            error:
             err.message ||

             'AI ERROR'

        });

    }

}
