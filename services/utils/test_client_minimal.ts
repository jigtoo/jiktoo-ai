
require('dotenv').config();
process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function main() {
    const { ai } = await import('../gemini/client');

    console.log("Checking AI Client initialization...");
    if (ai) {
        console.log("AI Client initialized successfully.");

    } else {
        console.log("AI Client is NULL (Environment variable missing?).");
        console.log("GEMINI_API_KEY env check:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
    }

    try {
        console.log("Attempting generation...");
        const { generateContentWithRetry } = await import('../gemini/client');
        const res = await generateContentWithRetry({
            model: 'gemini-1.5-flash',
            contents: 'Hello, are you working?'
        });
        console.log("Generation Success:", res?.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (e: any) {
        console.error("Generation Failed!");
        console.error("Error Message:", e.message);
        console.error("Error Stack:", e.stack);
        console.error("Full Error:", JSON.stringify(e, null, 2));
    }
}
main();
