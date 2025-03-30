import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaVolumeUp, FaStop, FaMicrophone } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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

  const handleSpeak = () => {
    if (!response) return;

    if (speech) speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(response);
    const selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
    setSpeech(utterance);
  };

  const handleStop = () => {
    speechSynthesis.cancel();
    setSpeech(null);
  };

  const handleVoiceInput = () => {
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
    };
  };

  return (
    <div className="relative w-full min-h-screen bg-black flex flex-col items-center text-white overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[url('https://source.unsplash.com/1920x1080/?stars,galaxy')] bg-cover bg-center opacity-40"></div>
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80 shooting-star"
            style={{
              top: `${Math.random() * 100}vh`,
              left: `${Math.random() * 100}vw`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-6 mt-35">
        <h1 className="text-5xl font-extrabold text-blue-400 tracking-wide glow-text">
          StackSummarize ✨
        </h1>
        <p className="text-lg text-gray-300 italic my-10">
          "Less searching, more coding! 🧑‍💻💡"
        </p>

        <div className=" w-[50rem] px-6">
          <div className="flex items-center bg-gray-800 p-4 rounded-full shadow-xl border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="text"
              placeholder="Ask a programming question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent text-white px-4 py-2 rounded-l-full focus:outline-none placeholder-gray-400"
            />
            <button
              onClick={handleVoiceInput}
              className="px-4 py-2 mr-2 bg-red-500 text-white cursor-pointer rounded-full hover:bg-red-600 transition flex items-center gap-2 shadow-lg"
            >
              <FaMicrophone />
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-500 text-white cursor-pointer rounded-full hover:bg-blue-600 transition flex items-center gap-2 shadow-lg"
            >
              <FaSearch /> Search
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl mt-6 px-6">
          <div className="bg-gray-900/80 p-6 rounded-lg shadow-md border border-gray-700 text-white min-h-[120px]">
            {loading ? (
              <p className="text-yellow-400 animate-pulse">Searching...</p>
            ) : (
              <div className="prose prose-invert overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children }) => (
                      <pre className=" p-4 bg-gray-800 rounded-md overflow-x-auto border border-gray-700">
                        <code className="text-sm text-gray-200">{children}</code>
                      </pre>
                    ),
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="px-1 py-0.5 bg-gray-700 rounded">
                          {children}
                        </code>
                      ) : (
                        <code className="block p-2 bg-gray-800 rounded-md overflow-x-auto">
                          {children}
                        </code>
                      ),
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

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

      <style>
        {`
          .shooting-star {
            animation: shootingStar 3s linear infinite;
          }
          @keyframes shootingStar {
            from {
              transform: translateY(0) translateX(0);
              opacity: 1;
            }
            to {
              transform: translateY(100vh) translateX(-100vw);
              opacity: 0;
            }
          }
          .glow-text {
            text-shadow: 0px 0px 15px rgba(0, 191, 255, 0.9) !important;
          }
        `}
      </style>
    </div>
  );
}

export default SearchAssistant;
