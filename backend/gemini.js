const {GoogleGenAI} = require("@google/genai");

const dotenv = require("dotenv");

dotenv.config();

const ai = new GoogleGenAI({
    apiKey:process.env.GEMINI_KEY
});


async function gemini(prompt){
    try{
    const response = await ai.models.generateContent({
        model:"gemini-2.5-flash",
        contents:prompt,
        config:{
            temperature:0.2
        }
    });
    const data = response.text;
    
    console.log(data);
    
    return  data;
    
    }catch(err){
        console.log(err);
    }
}

// gemini("Hello !");

module.exports={gemini};