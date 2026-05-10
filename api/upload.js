import pdf from 'pdf-parse';

export const config = {
    api: {
        bodyParser: false
    }
};

async function readFile(req){

    return new Promise((resolve,reject)=>{

        const chunks = [];

        req.on('data',chunk=>{
            chunks.push(chunk);
        });

        req.on('end',()=>{

            resolve(
                Buffer.concat(chunks)
            );

        });

        req.on('error',reject);

    });

}

export default async function handler(
    req,
    res
){

    try{

        const buffer =
         await readFile(req);

        const text =
         buffer.toString();

        let extracted = '';

        /* PDF */

        if(
            text.includes('application/pdf')
        ){

            const start =
             buffer.indexOf(
              Buffer.from('%PDF')
             );

            const pdfBuffer =
             buffer.slice(start);

            const data =
             await pdf(pdfBuffer);

            extracted =
             data.text;

        }

        /* TXT */

        else{

            extracted = text;

        }

        return res.status(200).json({
            text: extracted.slice(0,200000)
        });

    }catch(err){

        console.error(err);

        return res.status(500).json({
            error: err.message
        });

    }

}
