export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-2">Blue Alley Touring LLC</p>
          <h1 className="text-3xl font-black text-white mb-1">Terms & Conditions</h1>
          <p className="text-gray-500 text-sm">Last updated: June 29, 2026</p>
        </div>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Overview</h2>
            <p>
              These Terms and Conditions govern your access to and use of RiderLink, a show rider
              management platform operated by Blue Alley Touring LLC ("Blue Alley," "we," "us," or "our").
              By accessing a rider link or receiving communications through this platform, you agree
              to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Platform Purpose</h2>
            <p>
              RiderLink is an internal business tool used by Blue Alley Touring LLC to distribute
              official artist rider documents to venue buyers, promoters, and production staff for
              contracted live events. Access is granted on a per-show basis and is limited to
              individuals directly involved in the production of a specific event.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. SMS Messaging Terms</h2>
            <p className="mb-2">
              By providing your phone number to Blue Alley Touring LLC, you consent to receive
              transactional SMS messages related to your contracted event, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rider access notifications</li>
              <li>Show logistics updates</li>
              <li>Day-of-show reminders</li>
            </ul>
            <p className="mt-3"><strong className="text-white">Message frequency:</strong> 1–3 messages per contracted event.</p>
            <p className="mt-1"><strong className="text-white">Rates:</strong> Standard message and data rates may apply depending on your carrier.</p>
            <p className="mt-1"><strong className="text-white">Opt-out:</strong> Reply <strong className="text-white">STOP</strong> at any time to unsubscribe from SMS notifications.</p>
            <p className="mt-1"><strong className="text-white">Help:</strong> Reply <strong className="text-white">HELP</strong> for assistance or contact us at <a href="mailto:dre.davis@bluealleytouring.com" className="text-amber-400 hover:text-amber-300">dre.davis@bluealleytouring.com</a>.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Confidentiality</h2>
            <p>
              Rider documents shared through this platform contain confidential artist and production
              requirements. Recipients agree not to distribute, publish, or share rider contents
              with unauthorized parties. All information is provided solely for the purpose of
              producing the contracted event.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Share your rider access link with unauthorized individuals</li>
              <li>Use the platform for any purpose other than your contracted event</li>
              <li>Attempt to access rider information for shows you are not contracted for</li>
              <li>Reproduce or distribute confidential rider content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Limitation of Liability</h2>
            <p>
              Blue Alley Touring LLC provides this platform on an "as is" basis. We are not liable
              for any damages arising from the use or inability to use this platform, including
              delays, technical issues, or inaccuracies in rider information. It is the recipient's
              responsibility to confirm all rider requirements with tour management prior to the event.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Modifications</h2>
            <p>
              Blue Alley Touring LLC reserves the right to update these Terms at any time.
              Continued use of the platform following any changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Commonwealth of Virginia, without regard
              to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">9. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
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
