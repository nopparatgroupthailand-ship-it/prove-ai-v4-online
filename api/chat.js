import { GoogleGenerativeAI }
        const chunks = text.split(/\\n\\s*\\n/)

        const results = chunks.filter(chunk => {

            return question
    .toLowerCase()
    .split(/\s+/)
    .some(word =>
        chunk.toLowerCase().includes(word)
    );

        });

        return results.slice(0, 5).join('\n');

    } catch(err) {

        return '';

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

ตอบเฉพาะจากข้อมูลอ้างอิง
หากไม่มีข้อมูล ให้แจ้งว่า
"ไม่พบข้อมูลในเอกสาร"

ข้อมูลอ้างอิง:
${context}

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

    } catch(err) {

        console.error(err);

        return res.status(500).json({
            error: err.message
        });

    }

}
