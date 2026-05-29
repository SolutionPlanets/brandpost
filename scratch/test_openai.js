const OpenAI = require('openai');
const fs = require('fs');

const env = fs.readFileSync('d:/Brandpost/.env', 'utf8');
const keyMatch = env.match(/OPENAI_API_KEY=(sk-[^ \n\r]+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
    console.error('API key not found in .env');
    process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey,
});

async function test() {
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: "A simple red apple",
      n: 1,
      size: "1024x1024",
      quality: "medium",
    });
    
    // Save the entire object structure to a file
    fs.writeFileSync('d:/Brandpost/scratch/full_response.json', JSON.stringify(response, null, 2));
    console.log('Response saved to full_response.json');
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

test();
