import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import TrustIndicators from './components/TrustIndicators';
import ProblemSection from './components/ProblemSection';
import PricingCalculator from './components/PricingCalculator';
import SolutionSection from './components/SolutionSection';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <TrustIndicators />
      <ProblemSection />
      <PricingCalculator />
      <SolutionSection />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

export default App;
