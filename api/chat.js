import { GoogleGenerativeAI }
from "@google/generative-ai";

const genAI =
 new GoogleGenerativeAI(
   process.env.GEMINI_API_KEY
 );

const model =
 genAI.getGenerativeModel({
   model: "gemini-2.5-flash"
 });

export default async function handler(
 req,
 res
) {

 try {

   const { message, context }
    = req.body;

   const prompt = `
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
