// Quick test to verify the Gemini client fix
import { callGemini } from '../gemini/client';

async function testGeminiClient() {
    console.log('🧪 Testing Gemini Client Fix...\n');

    try {
        const response = await callGemini('Say "Hello" in JSON format: {"message": "Hello"}');
        console.log('✅ SUCCESS: Received response from Gemini');
        console.log('Response:', response);
        console.log('Response length:', response.length);

        // Test JSON parsing
        const cleaned = response.replace(/```json|```/g, '').trim();
        console.log('Cleaned response:', cleaned);

        if (cleaned) {
            try {
                const parsed = JSON.parse(cleaned);
                console.log('✅ JSON parsing successful:', parsed);
            } catch (parseError) {
                console.error('❌ JSON parsing failed:', parseError);
                console.error('Raw response was:', response);
            }
        } else {
            console.error('❌ Response became empty after cleaning');
        }

    } catch (error) {
        console.error('❌ FAILED: Error calling Gemini:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
    }
}

testGeminiClient().then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
}).catch(err => {
    console.error('\n💥 Test crashed:', err);
    process.exit(1);
});
