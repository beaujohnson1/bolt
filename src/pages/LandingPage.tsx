import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TrustIndicators from '../components/TrustIndicators';
import ProblemSection from '../components/ProblemSection';
import PricingCalculator from '../components/PricingCalculator';
import SolutionSection from '../components/SolutionSection';
import HowItWorks from '../components/HowItWorks';
import Features from '../components/Features';
import PricingSection from '../components/PricingSection';
import FAQ from '../components/FAQ';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';

const LandingPage = () => {
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
      <PricingSection />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;