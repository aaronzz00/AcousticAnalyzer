import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TestItem } from "../types";
import { StatisticsService } from "./StatisticsService";
import type { FilterOptions } from "./DataProcessor";

// API Key provided by user
const API_KEY = "AIzaSyD8X2j_RivjXHoCVSeztTz8rfffumKOqyA";

export class AIService {
    private static genAI = new GoogleGenerativeAI(API_KEY);
    private static model = AIService.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    static async analyzeData(group: TestItem[], filterOptions: FilterOptions): Promise<string> {
        try {
            // Calculate statistics for context
            const stats = StatisticsService.calculate(group, filterOptions);
            const itemName = group[0].name;
            const totalUnits = stats.units.total;
            const passRate = ((stats.units.passed / totalUnits) * 100).toFixed(2);

            // Prepare data summary for the prompt
            // We'll take a sample of values to avoid token limits if dataset is huge
            // For now, let's just send the statistics and a description of the data

            const prompt = `
            You are an expert acoustic data analyst. Analyze the following test data for the test item "${itemName}".
            
            Context:
            - This data represents the performance of a batch of products with the same configuration.
            - Total Units: ${totalUnits}
            - Pass Rate: ${passRate}%
            - Passed: ${stats.units.passed}
            - Failed: ${stats.units.failed}
            
            Please provide a brief analysis covering:
            1. Consistency verification
            2. Outlier identification (based on pass/fail stats)
            3. Distribution analysis
            
            Format the output as a concise summary suitable for a technical report comment. 
            End with a one-sentence conclusion starting with "Conclusion:".
            Keep the total length under 200 words.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error("AI Analysis failed:", error);
            return `Error: Failed to generate AI analysis. Details: ${error.message || error.toString()}`;
        }
    }

    static async summarizeComments(comments: Record<string, string>): Promise<string> {
        try {
            const commentEntries = Object.entries(comments)
                .filter(([_, comment]) => comment.trim() !== "")
                .map(([item, comment]) => `- ${item}: ${comment}`)
                .join("\n");

            if (!commentEntries) {
                return "No comments available to summarize.";
            }

            const prompt = `
            You are an expert acoustic data analyst. Summarize the following test item comments into a cohesive executive summary.
            
            Comments:
            ${commentEntries}
            
            Please provide:
            1. An overall assessment of the product performance.
            2. Key issues identified across different test items.
            3. A final conclusion.
            
            Format the output as a professional summary.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error("AI Summary failed:", error);
            return `Error: Failed to generate AI summary. Details: ${error.message || error.toString()}`;
        }
    }
}
