import React from "react";

/**
 * Renders a Typesense highlight snippet: <mark> segments become accent spans, everything else
 * stays plain text. Snippets come from our own gateway (Typesense escaping), never from user
 * input, so the tag parsing stays this simple.
 */
export const SearchSnippet: React.FC<{ snippet: string; className?: string }> = ({ snippet, className }) => {
  const parts = snippet.split(/<\/?mark>/g);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="search-snippet-mark">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};

export default SearchSnippet;
