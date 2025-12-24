"use client";
import { useState, useRef } from "react";

export default function AgentControl() {
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isActing, setIsActing] = useState(false);
  
  // CONFIG - Ideally move these to process.env in a real app
  const AGENT_URL = "https://agent.noahiberman.com";
  const SECRET = "mySecretPassword123"; // Must match your Python .env

  const handleCommand = async () => {
    if (!instruction) return;
    setIsActing(true);
    setStatus("Thinking...");
    
    try {
      const res = await fetch(`${AGENT_URL}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Key": SECRET,
        },
        body: JSON.stringify({ instruction }),
      });
      
      const data = await res.json();
      setStatus(`Success: ${data.details.action} at [${data.details.x}, ${data.details.y}]`);
      setInstruction(""); // Clear input on success
    } catch (e) {
      console.error(e);
      setStatus("Error: Agent disconnected");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 border border-zinc-800 bg-zinc-950 rounded-xl text-zinc-200 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
          Remote Visual Interface
        </h2>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full ${isActing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
           <span className="text-xs text-zinc-600 font-mono">ONLINE</span>
        </div>
      </div>
      
      {/* LIVE VIEWPORT */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 mb-4 group">
        {/* The Live Feed */}
        <img 
          src={`${AGENT_URL}/video_feed?token=${SECRET}`} 
          alt="Agent Vision"
          className="w-full h-full object-contain select-none"
        />
        
        {/* Overlay Grid (Optional Aesthetic) */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* COMMAND CONSOLE */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-3 text-zinc-600 font-mono">{">"}</span>
          <input
            type="text"
            className="w-full pl-8 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-sm focus:outline-none focus:border-zinc-600 transition-colors"
            placeholder="Describe action (e.g., 'Click the blue button')"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommand()}
            disabled={isActing}
          />
        </div>
        <button 
          onClick={handleCommand}
          disabled={isActing}
          className="px-6 py-2 bg-zinc-100 text-black font-semibold text-sm rounded hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isActing ? "EXE..." : "RUN"}
        </button>
      </div>
      
      {/* STATUS LOG */}
      <div className="mt-2 h-6 text-xs font-mono text-zinc-500">
        {status}
      </div>
    </div>
  );
}