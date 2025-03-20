import { BlockNode } from "@/app/types/chat";
import { CodeBlock } from "./CodeBlock";
import { HeadingBlock } from "./HeadingBlock";
import { ListBlock } from "./ListBlock";
import { ParagraphBlock } from "./ParagraphBlock";

interface BlockRendererProps {
  block: BlockNode;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "code":
      return <CodeBlock block={block} />;
    case "heading":
      return <HeadingBlock block={block} />;
    case "list":
      return <ListBlock block={block} />;
    case "paragraph":
      return <ParagraphBlock block={block} />;
    default:
      return null;
  }
} 