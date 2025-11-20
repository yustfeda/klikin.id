import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// Ensure API_KEY is available in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const analyzePaymentProof = async (file: File): Promise<string> => {
    if (!API_KEY) {
        return "Error: Gemini API key not configured.";
    }

    try {
        const base64Data = await fileToBase64(file);
        const imagePart = {
            inlineData: {
                mimeType: file.type,
                data: base64Data,
            },
        };

        const textPart = {
            text: "Analyze this payment receipt. Extract key information such as the total amount, any reference numbers, and words indicating payment status like 'LUNAS', 'BERHASIL', 'SUCCESS', or 'PAID'. List the findings clearly."
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // or another suitable model
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing image with Gemini:", error);
        if (error instanceof Error) {
            return `Error analyzing image: ${error.message}`;
        }
        return "An unknown error occurred during image analysis.";
    }
};
