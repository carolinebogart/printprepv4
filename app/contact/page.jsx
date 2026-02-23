export const metadata = {
  title: 'Contact — PrintPrep',
  description: 'Get in touch with the PrintPrep team. Email us or find us on social media.',
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="text-gray-600 mt-2">
          Have a question, suggestion, or need help? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Email</h2>
          <p className="text-gray-600 mb-3">
            For support, feedback, or partnership inquiries:
          </p>
          <a
            href="mailto:hello@printprep.app"
            className="text-blue-600 hover:underline font-medium"
          >
            hello@printprep.app
          </a>
          <p className="text-sm text-gray-500 mt-2">
            We typically respond within 24 hours on business days.
          </p>
        </div>

        {/* Social */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Follow Us</h2>
          <p className="text-gray-600 mb-4">
            Stay updated with tips, product updates, and printable design inspiration.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="https://www.instagram.com/printprep.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              <span>Instagram</span>
            </a>
            <a
              href="https://www.etsy.com/shop/PrintPrep"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.16 4.945c0-.32.038-.636.076-.953h-.076c-1.736 0-4.424-.023-5.35.023C2.326 4.083 1.5 5.27 1.5 6.63v10.742c0 1.36.826 2.545 2.31 2.613.926.046 3.614.023 5.35.023h.076c-.038-.317-.076-.633-.076-.953V4.945z" />
                <path d="M14.84 4.945c0-.32-.038-.636-.076-.953h.076c1.736 0 4.424-.023 5.35.023 1.484.068 2.31 1.255 2.31 2.615v10.742c0 1.36-.826 2.545-2.31 2.613-.926.046-3.614.023-5.35.023h-.076c.038-.317.076-.633.076-.953V4.945z" />
              </svg>
              <span>Etsy</span>
            </a>
          </div>
        </div>

        {/* Bug Reports */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Found a Bug?</h2>
          <p className="text-gray-600">
            If something isn&apos;t working as expected, email us with details about what happened
            and we&apos;ll look into it. Screenshots and the image dimensions you were working with
            help us debug faster.
          </p>
        </div>
      </div>
    </div>
  );
}
