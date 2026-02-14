import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";


@injectable()
export class GeminiClient {
    protected client: GoogleGenAI;
    constructor(
    ) {
        this.client = new GoogleGenAI({
            apiKey: process.env.GOOGLE_GENAI_KEY!
        });
    }

    public async getGeminiResponse(content:string):Promise<string|undefined> {
        const response = await this.client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content
        });
        return response.text;
    }
}