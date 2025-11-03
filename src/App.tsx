import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AmbientSound } from "@/components/AmbientSound";
import Home from "./pages/Home";
import About from "./pages/About";
import Ventures from "./pages/Ventures";
import VentureDetail from "./pages/VentureDetail";
import Contact from "./pages/Contact";
import FollowMyFlight from "./pages/FollowMyFlight";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col relative">
          <Navigation />
          <main className="flex-1 relative z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/ventures" element={<Ventures />} />
              <Route path="/ventures/:id" element={<VentureDetail />} />
              <Route path="/follow-my-flight" element={<FollowMyFlight />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <AmbientSound />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
