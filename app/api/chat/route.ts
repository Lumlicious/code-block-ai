import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BlockResponseSchema, BlockNode, TextNode } from "@/app/types/chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string | BlockNode[];
}

const model = new ChatGoogleGenerativeAI({
  modelName: "models/gemini-2.0-flash",
  apiKey: process.env.GOOGLE_API_KEY || "",
  maxOutputTokens: 2048,
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
});

const SYSTEM_PROMPT = `You are a helpful AI assistant. Your responses MUST be valid JSON with ALL property names in double quotes. This is critical - any unquoted property names will cause errors.

EXAMPLES OF CORRECT FORMAT:

1. Simple paragraph (NO formatting requested):
[
  {
    "type": "paragraph",
    "data": {
      "children": [
        {
          "text": "This is a simple paragraph"
        }
      ]
    }
  }
]

2. Paragraph with requested formatting:
[
  {
    "type": "paragraph",
    "data": {
      "children": [
        {
          "text": "This is ",
          "bold": true
        },
        {
          "text": "formatted",
          "italic": true
        },
        {
          "text": " text"
        }
      ]
    }
  }
]

3. Paragraph with INCORRECT formatting (DO NOT USE):
[
  {
    "type": "paragraph",
    "data": {
      "children": [
        {
          "text": "This is wrong",
          "bold": false,    // WRONG - don't include false values
          "italic": false,  // WRONG - don't include false values
          "underline": false // WRONG - don't include false values
        }
      ]
    }
  }
]

4. Code block:
[
  {
    "type": "code",
    "data": {
      "code": "console.log('Hello')",
      "language": "javascript"
    }
  }
]

CRITICAL RULES:
1. EVERY property name MUST be in double quotes
2. EVERY string value MUST be in double quotes
3. NEVER use single quotes for property names or string values
4. NEVER leave property names unquoted
5. Return ONLY the JSON array, no markdown, no code blocks, no backticks
6. Do not include any comments in the JSON
7. Do not include any trailing commas
8. Do not include any whitespace between property names and values
9. NEVER include formatting properties with false values
10. NEVER include formatting properties that weren't requested
11. For unformatted text, ONLY include the "text" property

Content Rules:
1. Use appropriate block types for different content:
   - Use "heading" for titles and section headers
   - Use "list" for bulleted or numbered lists
   - Use "code" for code snippets
   - Use "paragraph" for regular text
2. Format text using the children array with appropriate styling
3. Keep the response clean and properly structured
4. Only include formatting properties that are EXPLICITLY requested
5. Do not apply additional formatting that wasn't requested
6. For code blocks, ALWAYS include the "language" property with the appropriate language name

Schema:
{
  "type": "paragraph" | "heading" | "list" | "code",
  "data": {
    "code"?: string,                    // For code blocks
    "language"?: string,                // REQUIRED for code blocks (e.g., "typescript", "javascript", "python")
    "text"?: string,                    // For headings
    "level"?: number,                   // For headings (1-6)
    "children"?: [{                     // For paragraphs
      "text": string,
      "bold"?: boolean,                 // Only include if explicitly requested AND true
      "italic"?: boolean,               // Only include if explicitly requested AND true
      "underline"?: boolean,            // Only include if explicitly requested AND true
      "highlight"?: boolean,            // Only include if explicitly requested AND true
      "strikethrough"?: boolean,        // Only include if explicitly requested AND true
      "code"?: boolean,                 // Only include if explicitly requested AND true
      "color"?: string                  // Only include if explicitly requested and not null
    }],
    "style"?: "bulleted" | "numbered",  // For lists
    "items"?: (string | {               // For lists
      "content": [{
        "text": string,
        "bold"?: boolean,               // Only include if explicitly requested AND true
        "italic"?: boolean,             // Only include if explicitly requested AND true
        "underline"?: boolean,          // Only include if explicitly requested AND true
        "highlight"?: boolean,          // Only include if explicitly requested AND true
        "strikethrough"?: boolean,      // Only include if explicitly requested AND true
        "code"?: boolean,               // Only include if explicitly requested AND true
        "color"?: string                // Only include if explicitly requested and not null
      }]
    })[]
  }
}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: ChatMessage[] };
    console.log('Received API request:', {
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role,
        contentLength: typeof m.content === 'string' ? m.content.length : m.content.length
      }))
    });

    // Format messages for LangChain
    const formattedMessages = [
      new SystemMessage(SYSTEM_PROMPT),
      ...messages.map((msg: ChatMessage) => {
        let content: string;
        
        if (typeof msg.content === "string") {
          content = msg.content;
        } else {
          content = msg.content.map((block: BlockNode) => {
            if (block.type === "paragraph" && block.data.children) {
              return block.data.children.map(child => child.text).join('');
            }
            if (block.type === "heading") {
              return block.data.text || '';
            }
            if (block.type === "list") {
              return block.data.items?.map(item => 
                typeof item === "string" 
                  ? item 
                  : item.content?.map(child => child.text).join('') || ''
              ).join('\n') || '';
            }
            if (block.type === "code") {
              return block.data.code || '';
            }
            return '';
          }).join('\n');
        }

        // Ensure we don't send empty content
        if (!content.trim()) {
          content = "Empty message";
        }

        return msg.role === "user" 
          ? new HumanMessage(content)
          : new AIMessage(content);
      }),
    ];

    console.log('Formatted messages for model:', {
      messageCount: formattedMessages.length,
      systemPromptLength: SYSTEM_PROMPT.length,
      firstUserMessage: formattedMessages[1]?.content.slice(0, 100) + '...'
    });

    // Get response from the model
    const response = await model.invoke(formattedMessages);
    console.log('Received model response:', {
      contentType: typeof response.content,
      contentLength: typeof response.content === 'string' ? response.content.length : JSON.stringify(response.content).length
    });

    const responseContent = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Clean the response content by removing markdown formatting if present
    const cleanedContent = responseContent
      .replace(/^```json\n?/, '')  // Remove opening ```json
      .replace(/\n?```$/, '')      // Remove closing ```
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted property names
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Run twice to catch nested objects
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Run three times to catch deeply nested objects
      .replace(/'/g, '"')          // Replace single quotes with double quotes
      .trim();                     // Remove extra whitespace

    console.log('Cleaned content:', cleanedContent.slice(0, 200) + '...');

    // Try to parse the response as JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanedContent);
      if (!Array.isArray(parsedContent)) {
        console.error('Invalid response format:', {
          type: typeof parsedContent,
          content: parsedContent
        });
        throw new Error("Response is not an array");
      }
    } catch (error) {
      console.error('JSON parsing error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        content: cleanedContent.slice(0, 200) + '...',
        originalContent: responseContent.slice(0, 200) + '...'
      });
      return NextResponse.json({ 
        error: "Invalid response format",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Return the parsed content
    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error("API Error Details:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 