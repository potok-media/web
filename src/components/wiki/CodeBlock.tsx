import React, { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle } from "lucide-react";
import Prism from "../../utils/prism";
import "prismjs/themes/prism-tomorrow.css";
import { IconButton } from "../ui";

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="doc-code-card doc-code-card--relative">
      <IconButton className="doc-code-copy" onClick={handleCopy} aria-label="Copy code">
        {copied ? <CheckCircle size="0.875rem" className="doc-copy-icon--accent" /> : <Copy size="0.875rem" />}
      </IconButton>
      <pre className="doc-code-pre--flush">
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
