import Prism from "prismjs";

// Ensure Prism is registered globally so that language components can attach to it
window.Prism = Prism;

// Import required language definitions for syntax highlighting
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-nginx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-docker";

export default Prism;
