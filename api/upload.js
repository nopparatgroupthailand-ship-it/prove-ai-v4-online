import fs from 'fs';
import pdf from 'pdf-parse';
import formidable from 'formidable';

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(
    req,
    res
){

    try{

        const form =
         formidable({});

        const [fields, files] =
         await form.parse(req);

        const file =
         files.file?.[0];

        if(!file){

            return res.status(400).json({
                error:'ไม่พบไฟล์'
            });

        }

        const buffer =
         fs.readFileSync(
            file.filepath
         );

        let extracted = '';

        /* PDF */

        if(
            file.mimetype ===
            'application/pdf'
        ){

            const data =
             await pdf(buffer);

            extracted =
             data.text;

        }

        /* TXT */

        else{

            extracted =
             buffer.toString('utf8');

        }

        return res.status(200).json({

            text:
             extracted.slice(0,200000)

        });

    }catch(err){

        console.error(err);

        return res.status(500).json({

            error:
             err.message

        });

    }

}
