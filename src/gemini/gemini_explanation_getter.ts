import { inject, injectable } from "inversify";
import { GeminiClient } from "./gemini_client";
import { readFileSync } from "fs";
import path from "path";

@injectable()
export class GeminiExplanationGetter {
    private promptTemplate:string;

    constructor(@inject(GeminiClient) protected geminiClient: GeminiClient) {
        this.promptTemplate = readFileSync(path.join(__dirname, "./prompts/explanation_getter.md"), "utf-8");
    }

    public async getExplanation(word:string):Promise<string|null> {
        return await this.geminiClient.getGeminiResponse(this.promptTemplate.replace("{word}", word)) ?? null;
    }
}