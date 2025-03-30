import React from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

function HeroPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center text-white">
      {/* Starry Background */}
      <div className="absolute inset-0 z-0 bg-[url('https://source.unsplash.com/1920x1080/?stars,galaxy')] bg-cover bg-center opacity-40"></div>
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"></div>
      
      {/* Shooting Stars */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: `${Math.random() * 100}vh`,
              left: `${Math.random() * 100}vw`,
              animation: `shootingStar 3s linear infinite ${Math.random() * 5}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-extrabold text-blue-400 tracking-wide glow-text">
          StackSummarize ✨
        </h1>
        <p className="text-lg text-gray-300 italic mt-4 max-w-2xl mx-auto">
          "Less searching, more coding! Get instant programming answers with AI-powered search."
        </p>

        {/* Centered Call to Action */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => navigate("/search")}
            className="px-8 py-3 bg-blue-500 text-white cursor-pointer text-lg font-semibold rounded-full hover:bg-white hover:text-blue-500 transition duration-200 flex items-center gap-3 shadow-lg"
          >
            <FaSearch /> Start Searching
          </button>
        </div>
      </div>

      {/* Shooting Star Animation */}
      <style>
        {`
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
            text-shadow: 0px 0px 15px rgba(0, 191, 255, 0.9);
          }
        `}
      </style>
    </div>
  );
}

export default HeroPage;
