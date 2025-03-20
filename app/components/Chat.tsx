"use client";

import { useState, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Plus, Send, Trash2, MessageSquare } from "lucide-react";
import { Conversation, Message, MessageRole, BlockNode, TextNode } from "../types/chat";

// Helper function to convert plain text to block content
const textToBlockContent = (text: string): BlockNode[] => {
  return [{
    type: "paragraph",
    data: {
      children: [{ text }]
    }
  }];
};

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createNewConversation = () => {
    const now = new Date();
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        isPinned: false,
      },
    };
    console.log('New Conversation Created:', JSON.stringify(newConversation, null, 2));
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || isLoading) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: textToBlockContent(input),
      timestamp: new Date(),
    };

    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, newMessage],
      title: currentConversation.messages.length === 0 ? input.slice(0, 30) + "..." : currentConversation.title,
      metadata: {
        ...currentConversation.metadata,
        updatedAt: new Date(),
      },
    };
    console.log('After User Message:', JSON.stringify(updatedConversation, null, 2));

    setCurrentConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversation.id ? updatedConversation : conv
      )
    );
    setInput("");
    setIsLoading(true);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedConversation.messages.map(({ role, content }) => ({
            role,
            content: content.map(block => 
              block.data.children?.map(child => child.text).join('') || ''
            ).join('\n')
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from ChatGPT");
      }

      const data = await response.json();
      console.log('AI Response JSON:', JSON.stringify(data, null, 2));

      // Ensure the response is properly formatted as BlockNode[]
      const formattedContent: BlockNode[] = Array.isArray(data) ? data : [{
        type: "paragraph",
        data: {
          children: [{ text: typeof data === 'string' ? data : JSON.stringify(data) }]
        }
      }];

      const aiResponse: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: formattedContent,
        timestamp: new Date(),
        metadata: {
          model: "gemini-2.0-flash",
          processingTime: Date.now() - startTime,
        },
      };

      const conversationWithAI = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, aiResponse],
        metadata: {
          ...updatedConversation.metadata,
          updatedAt: new Date(),
          totalTokens: (updatedConversation.metadata.totalTokens || 0) + (aiResponse.metadata?.tokens || 0),
        },
      };
      console.log('After AI Response:', JSON.stringify(conversationWithAI, null, 2));
      setCurrentConversation(conversationWithAI);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversation.id ? conversationWithAI : conv
        )
      );
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: textToBlockContent("Sorry, I encountered an error. Please try again."),
        timestamp: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
      const conversationWithError = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, errorMessage],
        metadata: {
          ...updatedConversation.metadata,
          updatedAt: new Date(),
        },
      };
      setCurrentConversation(conversationWithError);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversation.id ? conversationWithError : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  const renderBlock = (block: BlockNode): ReactElement => {
    switch (block.type) {
      case "code":
        return (
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{block.data.code}</code>
          </pre>
        );
      case "heading":
        const level = block.data.level || 1;
        const headingClass = "font-bold mt-4";
        if (level === 1) return <h1 className={headingClass}>{block.data.text}</h1>;
        if (level === 2) return <h2 className={headingClass}>{block.data.text}</h2>;
        if (level === 3) return <h3 className={headingClass}>{block.data.text}</h3>;
        if (level === 4) return <h4 className={headingClass}>{block.data.text}</h4>;
        if (level === 5) return <h5 className={headingClass}>{block.data.text}</h5>;
        if (level === 6) return <h6 className={headingClass}>{block.data.text}</h6>;
        return <h1 className={headingClass}>{block.data.text}</h1>;
      case "list":
        const isNumbered = block.data.style === "numbered";
        const ListComponent = isNumbered ? "ol" : "ul";
        const listClass = isNumbered ? "list-decimal" : "list-disc";
        return (
          <ListComponent className={`${listClass} pl-6`}>
            {block.data.items?.map((item, index) => (
              <li key={index}>
                {typeof item === "string" ? (
                  item
                ) : (
                  item.content?.map((child: TextNode, childIndex: number) => (
                    <span
                      key={childIndex}
                      className={`${child.bold ? "font-bold" : ""} ${
                        child.italic ? "italic" : ""
                      } ${child.underline ? "underline" : ""} ${
                        child.highlight ? "bg-yellow-200" : ""
                      } ${child.strikethrough ? "line-through" : ""} ${
                        child.code ? "font-mono" : ""
                      } ${child.color ? `text-${child.color}` : ""}`}
                    >
                      {child.text}
                    </span>
                  ))
                )}
              </li>
            ))}
          </ListComponent>
        );
      case "paragraph":
        return (
          <p>
            {block.data.children?.map((child: TextNode, index: number) => (
              <span
                key={index}
                className={`${child.bold ? "font-bold" : ""} ${
                  child.italic ? "italic" : ""
                } ${child.underline ? "underline" : ""} ${
                  child.highlight ? "bg-yellow-200" : ""
                } ${child.strikethrough ? "line-through" : ""} ${
                  child.code ? "font-mono" : ""
                } ${child.color ? `text-${child.color}` : ""}`}
              >
                {child.text}
              </span>
            ))}
          </p>
        );
      default:
        return <></>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40">
        <div className="p-4">
          <Button
            onClick={createNewConversation}
            className="w-full justify-start gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted cursor-pointer ${
                  currentConversation?.id === conversation.id ? "bg-muted" : ""
                }`}
                onClick={() => setCurrentConversation(conversation)}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate">{conversation.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {currentConversation.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 p-4 rounded-lg ${
                      message.role === "assistant" ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {message.role === "user" ? "U" : "AI"}
                    </div>
                    <div className="flex-1">
                      {message.content.map((block, blockIndex) => (
                        <div key={blockIndex} className="mb-4">
                          {renderBlock(block)}
                        </div>
                      ))}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      AI
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={isLoading} className="cursor-pointer">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Welcome to AI Chat</h2>
              <p className="text-muted-foreground">
                Start a new conversation or select an existing one
              </p>
              <Button onClick={createNewConversation} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 