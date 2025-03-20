import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

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

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Start a chat
    const chat = model.startChat({
      history: history.slice(0, -1), // Exclude the current message from history
    });

    // Send the current message and get response
    const result = await chat.sendMessage(currentMessage);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      role: "assistant",
      content: text,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to get response from Gemini" },
      { status: 500 }
    );
  }
} 