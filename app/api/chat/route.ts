import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BlockResponseSchema, BlockNode, TextNode } from "@/app/types/chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string | BlockNode[];
}

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_API_KEY || "",
  maxOutputTokens: 2048,
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
});

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
    const { messages } = await req.json() as { messages: ChatMessage[] };

    // Format messages for LangChain
    const formattedMessages = [
      new SystemMessage(SYSTEM_PROMPT),
      ...messages.map((msg: ChatMessage) => {
        const content = typeof msg.content === "string" 
          ? msg.content 
          : msg.content.map((block: BlockNode) => {
              if (block.type === "paragraph" && block.data.children) {
                return block.data.children.map(child => child.text).join('');
              }
              if (block.type === "heading") {
                return block.data.text;
              }
              if (block.type === "list") {
                return block.data.items?.map(item => 
                  typeof item === "string" 
                    ? item 
                    : item.content?.map(child => child.text).join('') || ''
                ).join('\n') || '';
              }
              if (block.type === "code") {
                return block.data.code;
              }
              return '';
            }).join('\n');
        
        return msg.role === "user" 
          ? new HumanMessage(content)
          : new AIMessage(content);
      }),
    ];

    // Get response from the model
    const response = await model.invoke(formattedMessages);
    const responseContent = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Try to parse the response as JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(responseContent);
      if (!Array.isArray(parsedContent)) {
        throw new Error("Response is not an array");
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }
    
    // Return the parsed content
    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
} 