import { BlockNode, TextNode } from "@/app/types/chat";

interface ParagraphBlockProps {
  block: BlockNode;
}

export function ParagraphBlock({ block }: ParagraphBlockProps) {
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
} 