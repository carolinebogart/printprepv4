export const metadata = {
  title: 'Terms of Service & Privacy Policy — PrintPrep',
  description: 'PrintPrep terms of service and privacy policy.',
};

export default function LegalPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-12">Terms &amp; Privacy</h1>

      {/* Terms of Service */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6" id="terms">Terms of Service</h2>
        <p className="text-sm text-gray-500 mb-6">Last updated: February 2026</p>

        <div className="prose-section space-y-6 text-gray-600 leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Overview</h3>
            <p>
              PrintPrep (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) provides a web-based
              image resizing service for digital printable sellers. By creating an account or using our
              service, you agree to these terms.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Accounts</h3>
            <p>
              You must provide a valid email address and password to create an account. You are
              responsible for maintaining the security of your credentials and for all activity under
              your account. You must be at least 18 years old or have the consent of a parent or
              guardian.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Credits &amp; Billing</h3>
            <p>
              PrintPrep operates on a credit-based system. 1 credit = 1 image processed into all
              selected output sizes. Credits are purchased through a subscription plan and are
              non-refundable. Unused credits carry over when upgrading but reset upon plan renewal.
              Subscription payments are processed securely through Stripe.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Your Content</h3>
            <p>
              You retain full ownership of any images you upload. We do not claim any rights to your
              artwork. Uploaded images are stored in your private account and are not accessible to
              other users. You represent that you have the right to use and process any images you
              upload.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Acceptable Use</h3>
            <p>
              You may not use PrintPrep to process images that are illegal, infringe on
              third-party rights, or contain harmful content. We reserve the right to suspend or
              terminate accounts that violate these terms.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Service Availability</h3>
            <p>
              We strive to keep PrintPrep available 24/7 but do not guarantee uninterrupted service.
              We may perform maintenance, updates, or experience outages. We are not liable for any
              losses caused by temporary unavailability.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h3>
            <p>
              PrintPrep is provided &ldquo;as is.&rdquo; We make no warranties about the accuracy
              or reliability of our output. Our total liability for any claim related to the service
              is limited to the amount you paid in the 12 months preceding the claim.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Changes to Terms</h3>
            <p>
              We may update these terms from time to time. We will notify registered users of
              material changes via email. Continued use of the service after changes constitutes
              acceptance of the updated terms.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-gray-200 mb-16" />

      {/* Privacy Policy */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6" id="privacy">Privacy Policy</h2>
        <p className="text-sm text-gray-500 mb-6">Last updated: February 2026</p>

        <div className="prose-section space-y-6 text-gray-600 leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
            <p>
              <strong>Account information:</strong> Email address and hashed password (stored by
              Supabase Auth). We do not store your password in plain text.
            </p>
            <p className="mt-2">
              <strong>Uploaded images:</strong> Images you upload for processing are stored in your
              private storage bucket and are only accessible to your account.
            </p>
            <p className="mt-2">
              <strong>Usage data:</strong> We track basic usage metrics (images processed, credits
              used) to provide account functionality and improve the service.
            </p>
            <p className="mt-2">
              <strong>Payment information:</strong> Billing details are handled entirely by Stripe.
              We never see or store your full credit card number.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the image processing service</li>
              <li>To manage your account, credits, and subscription</li>
              <li>To send transactional emails (account verification, password resets)</li>
              <li>To improve the service based on aggregate usage patterns</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Data Sharing</h3>
            <p>
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes. We use the following services to operate PrintPrep:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase</strong> — Authentication and database</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Railway</strong> — Application hosting</li>
            </ul>
            <p className="mt-2">
              Each provider has their own privacy policy and handles your data according to their
              terms.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Data Retention</h3>
            <p>
              Uploaded images and processed outputs are retained in your account until you delete
              them or close your account. Account data is retained for as long as your account is
              active. If you request account deletion, we will remove your data within 30 days.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Your Rights</h3>
            <p>
              You can access, update, or delete your account information at any time through your
              Account Settings page. To request a full data export or account deletion, contact us
              at{' '}
              <a href="mailto:hello@printprep.app" className="text-blue-600 hover:underline">
                hello@printprep.app
              </a>.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Security</h3>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS),
              hashed passwords, and row-level security policies on all database tables. However, no
              method of transmission over the Internet is 100% secure.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Cookies</h3>
            <p>
              PrintPrep uses essential cookies only — specifically, authentication session cookies
              managed by Supabase. We do not use advertising or tracking cookies.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Contact</h3>
            <p>
              If you have questions about this privacy policy or your data, contact us at{' '}
              <a href="mailto:hello@printprep.app" className="text-blue-600 hover:underline">
                hello@printprep.app
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
