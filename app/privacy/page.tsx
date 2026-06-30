export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-2">Blue Alley Touring LLC</p>
          <h1 className="text-3xl font-black text-white mb-1">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: June 29, 2026</p>
        </div>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. About This Policy</h2>
            <p>
              This Privacy Policy describes how Blue Alley Touring LLC ("we," "us," or "our") collects,
              uses, and protects information in connection with RiderLink, our internal show rider
              management platform. RiderLink is used to coordinate official artist rider requirements
              between our touring team and professional venue buyers and promoters.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following information from buyers and promoters who receive rider access:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and professional title</li>
              <li>Business email address</li>
              <li>Phone number (when provided for SMS notifications)</li>
              <li>Venue and event details related to confirmed bookings</li>
              <li>Rider acknowledgment and confirmation data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. How We Use Your Information</h2>
            <p className="mb-2">Information collected is used solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Deliver official artist rider documents for contracted events</li>
              <li>Send transactional SMS and email notifications related to show logistics</li>
              <li>Coordinate day-of-show requirements between tour management and venue staff</li>
            </ul>
            <p className="mt-2">We do not use your information for marketing, advertising, or any purpose unrelated to your contracted event.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. SMS Communications</h2>
            <p>
              Phone numbers are collected directly by Blue Alley Touring LLC tour staff and used only
              to send transactional messages about specific contracted shows. Message frequency is
              limited to one or two messages per event. Standard message and data rates may apply.
              To opt out of SMS notifications, reply <strong className="text-white">STOP</strong> to
              any message. To request help, reply <strong className="text-white">HELP</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties for
              commercial purposes. We use the following service providers to operate the platform:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Supabase — secure database hosting</li>
              <li>Resend — transactional email delivery</li>
              <li>Twilio — SMS notification delivery</li>
              <li>Vercel — platform hosting</li>
            </ul>
            <p className="mt-2">Each provider is bound by their own privacy and data security policies.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Data Retention</h2>
            <p>
              Event and contact data is retained for the duration of the business relationship and
              for a reasonable period thereafter for record-keeping purposes. You may request deletion
              of your information by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including
              encrypted data storage and secure communication protocols.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Contact</h2>
            <p>
              For questions about this policy or to request data deletion, contact us at:
            </p>
            <p className="mt-2">
              <strong className="text-white">Blue Alley Touring LLC</strong><br />
              <a href="mailto:dre.davis@bluealleytouring.com" className="text-amber-400 hover:text-amber-300">
                dre.davis@bluealleytouring.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-xs">© 2026 Blue Alley Touring LLC · Powered by RiderLink</p>
        </div>
      </div>
    </div>
  )
}
