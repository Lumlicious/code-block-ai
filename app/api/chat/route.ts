import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { BlockResponseSchema, BlockNode, TextNode } from "@/app/types/chat";

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash",
  apiKey: process.env.GOOGLE_API_KEY || "",
});

const parser = StructuredOutputParser.fromZodSchema(BlockResponseSchema);

const SYSTEM_PROMPT = `You are a helpful AI assistant. Your responses must be formatted as a JSON array of content blocks, following this exact schema:

{
  "type": "paragraph" | "heading" | "list" | "code",
  "data": {
    "code"?: string,                    // For code blocks
    "text"?: string,                    // For headings
    "level"?: number,                   // For headings (1-6)
    "children"?: [{                     // For paragraphs
      "text": string,
      "bold"?: boolean,                 // Only include if explicitly requested
      "italic"?: boolean,               // Only include if explicitly requested
      "underline"?: boolean,            // Only include if explicitly requested
      "highlight"?: boolean,            // Only include if explicitly requested
      "strikethrough"?: boolean,        // Only include if explicitly requested
      "code"?: boolean,                 // Only include if explicitly requested
      "color"?: string                  // Only include if explicitly requested and not null
    }],
    "style"?: "bulleted" | "numbered",  // For lists
    "items"?: (string | {               // For lists
      "content": [{
        "text": string,
        "bold"?: boolean,               // Only include if explicitly requested
        "italic"?: boolean,             // Only include if explicitly requested
        "underline"?: boolean,          // Only include if explicitly requested
        "highlight"?: boolean,          // Only include if explicitly requested
        "strikethrough"?: boolean,      // Only include if explicitly requested
        "code"?: boolean,               // Only include if explicitly requested
        "color"?: string                // Only include if explicitly requested and not null
      }]
    })[]
  }
}

Rules:
1. Return ONLY the JSON array, no markdown or code blocks
2. Use appropriate block types for different content:
   - Use "heading" for titles and section headers
   - Use "list" for bulleted or numbered lists
   - Use "code" for code snippets
   - Use "paragraph" for regular text
3. Format text using the children array with appropriate styling
4. Keep the response clean and properly structured
5. IMPORTANT: Only include formatting properties that are EXPLICITLY requested in the user's prompt
6. IMPORTANT: Do not apply additional formatting that wasn't requested
7. IMPORTANT: If user asks for "bold text", only apply bold formatting
8. IMPORTANT: If user asks for "italic text", only apply italic formatting
9. IMPORTANT: If user asks for multiple formats, only apply those specific formats
10. IMPORTANT: Do not include formatting properties with false values
11. IMPORTANT: Do not include formatting properties with null values
12. IMPORTANT: For unformatted text, only include the "text" property

Example response for "Give me a paragraph with bold nouns":
[
  {
    "type": "paragraph",
    "data": {
      "children": [
        { "text": "The " },
        { "text": "cat", "bold": true },
        { "text": " sat on the " },
        { "text": "mat", "bold": true },
        { "text": "." }
      ]
    }
  }
]`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert messages to Gemini format, extracting text content from blocks
    const history = messages.map((msg: any) => {
      const text = Array.isArray(msg.content) 
        ? msg.content.map((block: BlockNode) => 
            block.data.children?.map((child: TextNode) => child.text).join('') || ''
          ).join('\n')
        : msg.content;
      
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    });

    // Get the last message as the current prompt
    const currentMessage = messages[messages.length - 1].content;
    const promptText = Array.isArray(currentMessage)
      ? currentMessage.map((block: BlockNode) => 
          block.data.children?.map((child: TextNode) => child.text).join('') || ''
        ).join('\n')
      : currentMessage;

    // Add system prompt to the beginning of the conversation
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${promptText}`;

    // Get the response
    const response = await model.invoke(fullPrompt);
    
    // Extract the content from the LangChain message
    const content = response.content;

    // Try to parse the response as JSON
    let parsedContent;
    try {
      parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      if (!Array.isArray(parsedContent)) {
        throw new Error("Response is not an array");
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }
    
    // Return the parsed content
    return NextResponse.json(parsedContent);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
} 