const { LiveSendToolResponseParameters } = require("@google/genai");
const dotenv = require("dotenv");

dotenv.config();

const Groq = require("groq-sdk");

const groqq= new Groq({
    apiKey:process.env.GROQ_KEY
}); 

async function groq(prompt){
    try{

    const completion = await groqq.chat.completions.create({
        model:"llama-3.3-70b-versatile",
        messages:[
            {
                role:"user",
                content:prompt,
                // temperature:0.2
                // response_format:{type:"json_object"}
            }
        ],
        temperature:0.2
    });

    return completion.choices[0].message.content;
}
catch(err){
    console.log(err);
    return;
}
}

module.exports={groq};