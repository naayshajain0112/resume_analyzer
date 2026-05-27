import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Component to render markdown with clean, minimal Tailwind styling
 * Converts AI-generated markdown into a modern, lightweight SaaS-style report
 */
const ReportRenderer = ({ content }) => {
  // Helper function to create subtle status badges based on content keywords
  const getStatusBadge = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('major mismatch') || lowerText.includes('critical') || lowerText.includes('❌')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Major Mismatch
        </span>
      );
    }
    
    if (lowerText.includes('minor variance') || lowerText.includes('warning') || lowerText.includes('⚠️')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          Minor Variance
        </span>
      );
    }
    
    if (lowerText.includes('match') || lowerText.includes('verified') || lowerText.includes('✅')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Match
        </span>
      );
    }
    
    return null;
  };

  // Custom markdown component renderers
  const components = {
    // Headings - cleaner, lighter hierarchy
    h1: ({ node, ...props }) => (
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mt-10 mb-5 pb-3 border-b border-gray-200">
        {props.children}
      </h1>
    ),
    
    h2: ({ node, ...props }) => (
      <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mt-8 mb-4 pt-4 pb-2 border-b border-gray-100">
        {props.children}
      </h2>
    ),
    
    h3: ({ node, ...props }) => (
      <h3 className="text-lg font-medium text-gray-700 mt-6 mb-3">
        {props.children}
      </h3>
    ),
    
    h4: ({ node, ...props }) => (
      <h4 className="text-base font-medium text-gray-700 mt-4 mb-2">
        {props.children}
      </h4>
    ),
    
    // Paragraphs - lighter, softer
    p: ({ node, ...props }) => {
      // Check if paragraph contains status keywords
      const text = props.children?.toString() || '';
      const statusBadge = getStatusBadge(text);
      
      return (
        <p className="text-gray-600 mb-5 leading-7 text-sm md:text-base">
          {props.children}
          {statusBadge && (
            <>
              <br />
              <br />
              {statusBadge}
            </>
          )}
        </p>
      );
    },
    
    // Lists - lighter spacing
    ul: ({ node, ...props }) => (
      <ul className="list-disc list-inside space-y-2.5 mb-5 ml-1 md:ml-2 text-gray-600 text-sm md:text-base">
        {props.children}
      </ul>
    ),
    
    ol: ({ node, ...props }) => (
      <ol className="list-decimal list-inside space-y-2.5 mb-5 ml-1 md:ml-2 text-gray-600 text-sm md:text-base">
        {props.children}
      </ol>
    ),
    
    li: ({ node, ...props }) => (
      <li className="text-gray-600 leading-7 text-sm md:text-base">
        {props.children}
      </li>
    ),
    
    // Blockquotes - softer styling
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-3 border-gray-300 bg-gray-50 rounded-r p-4 md:p-5 my-5 not-italic text-gray-600 text-sm md:text-base leading-7">
        {props.children}
      </blockquote>
    ),
    
    // Code blocks and inline code
    code: ({ node, inline, ...props }) => {
      if (inline) {
        return (
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono text-xs md:text-sm">
            {props.children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-900 text-gray-100 p-4 md:p-5 rounded-lg overflow-x-auto my-5 font-mono text-xs md:text-sm leading-6">
          {props.children}
        </code>
      );
    },
    
    pre: ({ node, ...props }) => (
      <pre className="bg-gray-900 text-gray-100 p-4 md:p-5 rounded-lg overflow-x-auto my-5 font-mono text-xs md:text-sm">
        {props.children}
      </pre>
    ),
    
    // Tables - subtle, clean styling
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
          {props.children}
        </table>
      </div>
    ),
    
    thead: ({ node, ...props }) => (
      <thead className="bg-gray-50 border-b border-gray-200">
        {props.children}
      </thead>
    ),
    
    tbody: ({ node, ...props }) => (
      <tbody className="divide-y divide-gray-100">
        {props.children}
      </tbody>
    ),
    
    tr: ({ node, ...props }) => (
      <tr className="hover:bg-gray-50 transition-colors">
        {props.children}
      </tr>
    ),
    
    th: ({ node, ...props }) => (
      <th className="px-4 md:px-5 py-2.5 md:py-3 text-left font-medium text-gray-700 bg-gray-50 text-xs md:text-sm">
        {props.children}
      </th>
    ),
    
    td: ({ node, ...props }) => (
      <td className="px-4 md:px-5 py-2.5 md:py-3 text-gray-600 border-b border-gray-100 text-xs md:text-sm leading-6">
        {props.children}
      </td>
    ),
    
    // Strong/Bold - use medium weight instead of bold
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-gray-800">
        {props.children}
      </strong>
    ),
    
    em: ({ node, ...props }) => (
      <em className="italic text-gray-600">
        {props.children}
      </em>
    ),
    
    // Links - subtle styling
    a: ({ node, ...props }) => (
      <a 
        className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium transition-colors text-sm md:text-base"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {props.children}
      </a>
    ),
    
    // Horizontal rules - subtle separators
    hr: () => (
      <hr className="my-7 border-t border-gray-200" />
    ),
  };

  return (
    <div className="prose prose-base max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ReportRenderer;
