import { BlockNode, TextNode } from "@/app/types/chat";

interface ListBlockProps {
  block: BlockNode;
}

export function ListBlock({ block }: ListBlockProps) {
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
} 