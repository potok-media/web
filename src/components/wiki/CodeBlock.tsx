import React, { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle } from "lucide-react";
import Prism from "../../utils/prism";
import "prismjs/themes/prism-tomorrow.css";

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
    <div className="doc-code-card" style={{ position: "relative", margin: "var(--space-m) 0" }}>
      <button className="doc-code-copy" onClick={handleCopy}>
        {copied ? <CheckCircle size={14} style={{ color: "var(--accent-color)" }} /> : <Copy size={14} />}
      </button>
      <pre style={{ margin: 0, padding: 0, background: "transparent" }}>
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
