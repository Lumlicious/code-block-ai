import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { BlockResponseSchema } from "@/app/types/chat";

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash",
  apiKey: process.env.GOOGLE_API_KEY || "",
});

const parser = StructuredOutputParser.fromZodSchema(BlockResponseSchema);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert messages to Gemini format
    const history = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Get the last message as the current prompt
    const currentMessage = messages[messages.length - 1].content;

    // Create the prompt with format instructions
    const formatInstructions = parser.getFormatInstructions();
    const prompt = `${currentMessage}

You are a JSON API that returns structured text content. Your response must be a valid JSON array of content objects that match this schema:

${formatInstructions}

Available content types:
1. paragraph: For text content with inline formatting
2. code: For code snippets
3. heading: For section headings
4. list: For bullet or numbered lists

Available formatting options for paragraph content:
- bold: Makes text bold
- italic: Makes text italic
- underline: Makes text underlined
- highlight: Makes text highlighted
- strikethrough: Makes text struck through
- code: Makes text monospace (for inline code)

Response requirements:
1. Return ONLY the raw JSON array, no additional text or formatting
2. DO NOT wrap the response in code blocks or markdown
3. DO NOT include any newlines or extra whitespace
4. DO NOT use markdown syntax (** or * or _ or __)
5. Only include formatting properties when they are true
6. Split different content types into separate objects in the array
7. ALWAYS use ALL formatting types that are requested in the input
8. For code snippets, use a separate "code" type object
9. For multiple paragraphs, create separate paragraph objects
10. The response must be valid JSON that can be parsed directly`;

    // Get the response and parse it
    const response = await model.invoke(prompt);
    console.log('Raw LLM response:', JSON.stringify(response, null, 2));
    console.log('Response content:', JSON.stringify(response.content, null, 2));
    
    const responseText = typeof response.content === 'string' 
      ? response.content 
      : Array.isArray(response.content) 
        ? response.content.map(c => {
            if (typeof c === 'string') return c;
            if (c && typeof c === 'object' && 'text' in c) return (c as { text: string }).text;
            return '';
          }).join('')
        : response.content && typeof response.content === 'object' && 'text' in response.content
          ? (response.content as { text: string }).text
          : '';

    // Clean up the response text by removing code blocks and newlines
    const cleanText = responseText
      .replace(/```json\n?/g, '') // Remove ```json
      .replace(/```\n?/g, '')     // Remove closing ```
      .replace(/\n/g, '')         // Remove newlines
      .trim();                    // Remove extra whitespace

    console.log('Processed response text:', cleanText);
    
    const parsedResponse = await parser.parse(cleanText);
    console.log('Parsed response:', JSON.stringify(parsedResponse, null, 2));

    // Ensure we always return an array
    const responseArray = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
    return NextResponse.json(responseArray);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json([{
      type: "paragraph",
      data: {
        children: [{
          text: "I apologize, but I encountered an error processing your request. Please try again.",
          bold: false
        }]
      }
    }]);
  }
} 