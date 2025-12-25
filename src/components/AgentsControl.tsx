"use client";

export default function AgentControl() {
  // Replace with your actual Cloudflare tunnel URL
  const AGENT_URL = "https://agent.noahiberman.com";

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
          Remote Visual Interface
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-zinc-600 font-mono">ONLINE</span>
        </div>
      </div>
      
      <iframe
        src={AGENT_URL}
        width="100%"
        height="600"
        frameBorder="0"
        style={{ 
          border: "none", 
          borderRadius: "8px",
          backgroundColor: "#000"
        }}
        allow="camera; microphone"
        title="Visual Agent Dashboard"
      />
    </div>
  );
}
