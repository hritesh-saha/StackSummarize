import React, { useState } from "react";
import axios from "axios";
import { FaSearch } from "react-icons/fa"; 
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Plugin for GitHub-Flavored Markdown

function SearchAssistant() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/ask", { query });
      setResponse(res.data.answer);
    } catch (error) {
      setResponse("Error fetching answer.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center text-blue-400 mb-6">
          AI Stack Overflow Assistant
        </h2>

        <div className="flex items-center gap-3 bg-gray-700 p-3 rounded-lg">
          <input
            type="text"
            placeholder="Ask a programming question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 cursor-pointer"
          >
            <FaSearch /> Search
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg text-white text-left min-h-[50px]">
          {loading ? (
            <p className="text-yellow-400 animate-pulse">Searching...</p>
          ) : (
            <div className="prose prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchAssistant;
