import fs from 'fs';
import pdf from 'pdf-parse';
import formidable from 'formidable';

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(req, res) {
    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        if (!file) {
            return res.status(400).json({ error: 'ไม่พบไฟล์' });
        }

        const buffer = fs.readFileSync(file.filepath);
        let extracted = '';

        // แยกข้อความจาก PDF หรือ Text
        if (file.mimetype === 'application/pdf') {
            const data = await pdf(buffer);
            extracted = data.text;
        } else {
            extracted = buffer.toString('utf8');
        }

        // ส่งกลับข้อความที่ดึงได้ เพื่อให้ Frontend นำไปเก็บไว้ใน State 
        // แล้วส่งต่อไปให้ Ollama ใน chat.js อีกที
        return res.status(200).json({
            text: extracted.slice(0, 200000),
            filename: file.originalFilename
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}
