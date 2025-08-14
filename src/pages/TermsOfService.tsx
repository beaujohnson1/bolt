import React from 'react';
import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  return (
    <>
      <SEO 
        title="Terms of Service"
        description="EasyFlip.ai terms of service - Rules and guidelines for using our platform"
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
            Terms of Service
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Last Updated: August 14, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using EasyFlip.ai ("Service"), you agree to be bound by these 
                Terms of Service ("Terms"). If you disagree with any part of these terms, 
                you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p>
                EasyFlip.ai is an AI-powered platform that helps users create and manage 
                listings across multiple online marketplaces including eBay, Facebook 
                Marketplace, Poshmark, and others.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p>To use certain features, you must create an account. You agree to:</p>
              <ul>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>Violate any applicable laws or regulations</li>
                <li>Create false, misleading, or deceptive listings</li>
                <li>Sell prohibited or illegal items</li>
                <li>Infringe on intellectual property rights</li>
                <li>Spam or harass other users</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Marketplace Compliance</h2>
              <p>
                You are responsible for complying with the terms and policies of each 
                marketplace where you list items. We are not responsible for marketplace 
                policy violations or account suspensions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. AI-Generated Content</h2>
              <p>
                Our AI generates listings based on your photos and inputs. While we strive 
                for accuracy, you are responsible for reviewing and verifying all generated 
                content before publication.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Fees and Payment</h2>
              <p>
                Subscription fees are billed in advance and are non-refundable except as 
                required by law. We may change our pricing with 30 days' notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
              <p>
                The Service and its original content are owned by EasyFlip.ai and are 
                protected by intellectual property laws. You retain rights to content you 
                upload but grant us a license to use it for providing the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which 
                also governs your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Disclaimers</h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We do not 
                guarantee uninterrupted or error-free operation, or that the Service will 
                meet your specific requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
              <p>
                In no event shall EasyFlip.ai be liable for any indirect, incidental, 
                special, or consequential damages, including lost profits or data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for any reason, 
                including violation of these Terms. You may cancel your account at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless EasyFlip.ai from any claims 
                arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
              <p>
                These Terms are governed by the laws of [Your State/Country], without 
                regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. Continued use of the Service after 
                changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
              <p>If you have questions about these Terms, please contact us at:</p>
              <ul>
                <li>Email: legal@easyflip.ai</li>
                <li>Website: https://easyflip.ai/contact</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">17. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining 
                provisions will continue to be valid and enforceable.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;