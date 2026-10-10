import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Auditor from "./components/Auditor";
import Footer from "./components/Footer";

export default function App() {
  const [externalSample, setExternalSample] = useState(null);

  const handleScrollToAuditor = () => {
    const el = document.getElementById("auditor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLoadSampleFromHero = (sampleKey) => {
    setExternalSample({ key: sampleKey, timestamp: Date.now() });
    handleScrollToAuditor();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <Navbar onScrollToAuditor={handleScrollToAuditor} />

      <main className="grow">
        <Hero
          onScrollToAuditor={handleScrollToAuditor}
          onLoadSample={handleLoadSampleFromHero}
        />
        <Auditor externalSample={externalSample} />
      </main>

      <Footer />
    </div>
  );
}