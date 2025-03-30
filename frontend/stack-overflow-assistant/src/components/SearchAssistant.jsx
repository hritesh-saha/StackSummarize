import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaVolumeUp, FaStop } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function SearchAssistant() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [speech, setSpeech] = useState(null);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices.filter((voice) => voice.lang.startsWith("en")));
    };

    speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();

    return () => speechSynthesis.cancel(); // Stop speaking if page reloads
  }, []);

  // Handle search request
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

  // Handle speech synthesis
  const handleSpeak = () => {
    if (!response) return;

    if (speech) speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(response);
    const selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
    setSpeech(utterance);
  };

  // Handle stopping speech
  const handleStop = () => {
    speechSynthesis.cancel();
    setSpeech(null);
  };

  return (
    <div className="relative w-full min-h-screen bg-black flex flex-col items-center text-white overflow-hidden">
      {/* Starry Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://source.unsplash.com/1920x1080/?stars,galaxy')] bg-cover bg-center opacity-40 animate-fadeIn"></div>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 mt-35">
        <h1 className="text-5xl font-extrabold text-blue-400 tracking-wide glow-text">StackSummarize ✨</h1>
        <p className="text-lg text-gray-300 italic my-10">"Less searching, more coding! 🧑‍💻💡"</p>

        {/* Search Input */}
        <div className="w-full max-w-3xl px-6">
          <div className="flex items-center bg-gray-800 p-4 rounded-full shadow-xl border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="text"
              placeholder="Ask a programming question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white px-4 py-2 rounded-l-full focus:outline-none placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-500 text-white cursor-pointer rounded-full hover:bg-blue-600 transition flex items-center gap-2 shadow-lg"
            >
              <FaSearch /> Search
            </button>
          </div>
        </div>

        {/* Response Box */}
        <div className="w-full max-w-3xl mt-6 px-6">
          <div className="bg-gray-900/80 p-6 rounded-lg shadow-md border border-gray-700 text-white min-h-[120px]">
            {loading ? (
              <p className="text-yellow-400 animate-pulse">Searching...</p>
            ) : (
              <div className="prose prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Speak/Stop Buttons */}
        {response && (
          <div className="mt-4 flex flex-wrap gap-4 opacity-100 transition-opacity duration-500">
            <button
              onClick={handleSpeak}
              className="px-6 py-2 cursor-pointer bg-green-500 text-white rounded-full flex items-center gap-2 hover:bg-green-600 transition shadow-lg"
            >
              <FaVolumeUp /> Speak
            </button>
            <button
              onClick={handleStop}
              className="px-6 py-2 cursor-pointer bg-red-500 text-white rounded-full flex items-center gap-2 hover:bg-red-600 transition shadow-lg"
            >
              <FaStop /> Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchAssistant;
