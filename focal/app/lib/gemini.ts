import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    SYSTEM_PROMPT,
    getInterventionPrompt,
    getRandomFallbackMessage,
    PromptContext
} from './promptTemplates';

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;

export function initializeGemini(apiKey: string) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export function isGeminiInitialized(): boolean {
    return genAI !== null;
}

/**
 * Generate an intervention message using Gemini
 */
export async function generateInterventionMessage(
    context: PromptContext
): Promise<string> {
    // If Gemini not initialized, use fallback
    if (!genAI) {
        console.warn('Gemini not initialized, using fallback message');
        return getRandomFallbackMessage(context.escalationLevel);
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.9, // Higher creativity for varied responses
            },
        });

        const prompt = getInterventionPrompt(context);

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: SYSTEM_PROMPT },
                        { text: prompt },
                    ],
                },
            ],
        });

        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
            throw new Error('Empty response from Gemini');
        }

        // Clean up the response (remove quotes if wrapped)
        let cleanedText = text.trim();
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
            cleanedText = cleanedText.slice(1, -1);
        }

        return cleanedText;
    } catch (error) {
        console.error('Gemini generation failed:', error);
        return getRandomFallbackMessage(context.escalationLevel);
    }
}

/**
 * Check if the API key is valid by making a test request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const testAI = new GoogleGenerativeAI(apiKey);
        const model = testAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Simple test generation
        await model.generateContent('Say "ok" in one word');
        return true;
    } catch {
        return false;
    }
}
