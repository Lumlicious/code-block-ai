import { z } from "zod";

export type MessageRole = "user" | "assistant";

export const TextNodeSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  code: z.boolean().optional(),
  highlight: z.boolean().optional(),
  color: z.string().nullable().optional(),
});

export const ListItemSchema = z.object({
  content: z.array(TextNodeSchema).optional(),
  text: z.string().optional(),
});

export const BlockNodeSchema = z.object({
  type: z.enum(["paragraph", "code", "heading", "list"]),
  data: z.object({
    children: z.array(TextNodeSchema).optional(),
    level: z.number().optional(),
    language: z.string().optional(),
    ordered: z.boolean().optional(),
    code: z.string().optional(),
    text: z.string().optional(),
    style: z.enum(["bulleted", "numbered"]).optional(),
    items: z.array(z.union([z.string(), ListItemSchema])).optional(),
  }),
});

// Schema for a single block or array of blocks
export const BlockResponseSchema = z.union([
  BlockNodeSchema,
  z.array(BlockNodeSchema)
]);

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.array(BlockNodeSchema),
  timestamp: z.date(),
  metadata: z.object({
    model: z.string().optional(),
    tokens: z.number().optional(),
    processingTime: z.number().optional(),
    error: z.string().optional(),
  }).optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(MessageSchema),
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    totalTokens: z.number().optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export type TextNode = z.infer<typeof TextNodeSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type BlockNode = z.infer<typeof BlockNodeSchema>;
export type BlockResponse = z.infer<typeof BlockResponseSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

export interface ConversationMetadata {
  createdAt: Date;
  updatedAt: Date;
  totalTokens?: number;
  isArchived?: boolean;
  isPinned?: boolean;
  tags?: string[];
} 