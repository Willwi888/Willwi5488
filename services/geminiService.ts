import { GoogleGenAI } from '@google/genai';

/**
 * Converts a Blob object to a Base64 encoded string.
 * @param blob The Blob to convert.
 * @returns A promise that resolves with the Base64 string (without the data: prefix).
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Initializes the GoogleGenAI client.
 * Note: The API key is sourced from process.env.API_KEY.
 */
export const initializeGenAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};
