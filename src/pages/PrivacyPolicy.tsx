import React from 'react';
import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <>
      <SEO 
        title="Privacy Policy"
        description="EasyFlip.ai privacy policy - How we collect, use, and protect your data"
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Last Updated: August 14, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, including:</p>
              <ul>
                <li>Account information (name, email, password)</li>
                <li>Item photos and descriptions you upload</li>
                <li>Marketplace credentials (with your permission)</li>
                <li>Transaction and sales data</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Process your item listings across marketplaces</li>
                <li>Generate AI-powered pricing and descriptions</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
              <p>We do not sell, trade, or rent your personal information. We may share information:</p>
              <ul>
                <li>With marketplaces when you authorize listings (eBay, Facebook, etc.)</li>
                <li>With service providers who assist in our operations</li>
                <li>To comply with legal obligations</li>
                <li>To protect rights, privacy, safety, or property</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your 
                personal data against unauthorized access, alteration, disclosure, or destruction. 
                This includes encryption, secure servers, and regular security audits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
              <p>Our service integrates with:</p>
              <ul>
                <li>OpenAI for AI-powered descriptions</li>
                <li>Google Vision API for image recognition</li>
                <li>Supabase for authentication and data storage</li>
                <li>Various marketplace APIs (eBay, Facebook, etc.)</li>
              </ul>
              <p>Each service has its own privacy policy that governs their use of your data.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity and hold 
                certain information. You can instruct your browser to refuse all cookies or 
                indicate when a cookie is being sent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p>
                Our service is not directed to individuals under 18. We do not knowingly 
                collect personal information from children under 18.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of 
                any changes by posting the new Privacy Policy on this page and updating 
                the "Last Updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at:</p>
              <ul>
                <li>Email: privacy@easyflip.ai</li>
                <li>Website: https://easyflip.ai/contact</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. GDPR Compliance</h2>
              <p>
                For users in the European Economic Area (EEA), we comply with GDPR requirements 
                including lawful basis for processing, data minimization, and your rights under 
                GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. California Privacy Rights</h2>
              <p>
                California residents have additional rights under CCPA, including the right 
                to know what personal information is collected, used, shared, or sold.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;