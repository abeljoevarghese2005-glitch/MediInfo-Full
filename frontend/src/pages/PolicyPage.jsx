import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const LAST_UPDATED = 'August 25, 2026';
const SUPPORT_EMAIL = 'support@niraamo.com';

/**
 * PolicyPage
 *
 * Single, mobile-first scrollable page containing Privacy Policy, Terms of
 * Service, and Refund Policy as collapsible accordion sections, followed by
 * a required consent checkbox.
 *
 * Props:
 *  - onConsentChange(hasConsented: boolean) — optional. Called whenever the
 *    consent checkbox is toggled, so a parent wrapper can enable/disable its
 *    own "Accept & Continue" button based on hasConsented.
 */
export default function PolicyPage({ onConsentChange }) {
  const [openSection, setOpenSection] = useState('privacy');
  const [hasConsented, setHasConsented] = useState(false);

  const toggleSection = (key) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const handleConsentToggle = (e) => {
    const checked = e.target.checked;
    setHasConsented(checked);
    onConsentChange?.(checked);
  };

  const sections = [
    { key: 'privacy', label: 'Privacy Policy', Content: PrivacyContent },
    { key: 'terms', label: 'Terms of Service', Content: TermsContent },
    { key: 'refund', label: 'Refund Policy', Content: RefundContent },
  ];

  return (
    <div className="min-h-screen bg-green-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 py-10 px-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Privacy Policy, Terms & Refunds
          </h1>
          <p className="mt-2 text-sm font-normal text-white/90">
            Last Updated: {LAST_UPDATED}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="max-w-2xl mx-auto px-4 mt-6 pb-6">
        <div className="space-y-3">
          {sections.map(({ key, label, Content }) => {
            const isOpen = openSection === key;
            return (
              <div
                key={key}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold tracking-tight text-gray-800">
                    {label}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-emerald-600 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-6 pt-1 border-t border-emerald-100">
                    <Content />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 mt-6 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConsented}
            onChange={handleConsentToggle}
            className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I have read and agree to the Privacy Policy, Terms of Service,
            and Refund Policy.
          </span>
        </label>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold tracking-tight text-gray-800 mb-2">
        {title}
      </h3>
      <div className="font-normal text-sm text-gray-600 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function PrivacyContent() {
  return (
    <div>
      <p className="font-normal text-sm text-gray-600 leading-relaxed mb-5">
        Niraamo ("we", "our", or "us") is a healthcare technology platform
        operated in India that connects patients with doctors, enabling
        appointment booking, live queue tracking, digital prescriptions,
        video consultations, medicine reminders, and AI-assisted health
        guidance. This Privacy Policy explains how we collect, use, store,
        and protect your information across our website and mobile
        application (together, the "Platform"). By using Niraamo, you agree
        to the collection and use of information as described in this
        policy.
      </p>

      <Section title="1. Who We Are">
        <p>
          Niraamo is registered and operated in India. For any privacy-related
          queries or grievances, contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p className="font-medium text-gray-700">Information you provide directly:</p>
        <List
          items={[
            'Account details — name, email address, phone number, and password when you register (or your Google account details, if you sign in with Google)',
            "Profile information — for patients: age, gender, and basic health details you choose to add. For doctors: medical registration/license number, specialization, clinic/hospital name, consultation fees, qualifications, and location",
            'Appointment data — booking history, appointment notes, and consultation type (in-clinic, video, or home visit)',
            'Prescription data — digital prescriptions issued by doctors through the app',
            'Reviews — ratings and feedback you submit about doctors',
          ]}
        />
        <p className="font-medium text-gray-700 pt-2">Information collected automatically:</p>
        <List
          items={[
            'Location data — your approximate location (with permission) to show nearby doctors and enable location-based features like live queue tracking, only while the app is in use',
            'Device information — device type, OS version, and app version for debugging and performance',
            'Usage data — pages visited and features used, to improve the app experience',
          ]}
        />
        <p className="font-medium text-gray-700 pt-2">Information we do NOT collect:</p>
        <List
          items={[
            'We do not collect or store your payment card, UPI, or bank account details — all payments are handled entirely by our third-party payment gateway partners (see Section 5)',
            'We do not store medical records, lab reports, or imaging files',
            'We do not access your contacts, camera, or microphone unless a feature you initiate requires it — for example, joining a video consultation',
          ]}
        />
      </Section>

      <Section title="3. How We Use Your Information">
        <List
          items={[
            'Create and manage your account',
            'Match patients with nearby, available doctors',
            'Enable appointment booking, live queue tracking, and home-visit scheduling',
            'Enable video consultations between patients and doctors',
            'Allow doctors to issue, and patients to access, digital prescriptions',
            'Power our AI assistant to help you find the right doctor and answer general health questions',
            'Send appointment reminders and notifications',
            'Process payments, via third-party gateways, for consultations booked through the Platform',
            'Improve app performance and fix bugs',
            'Comply with applicable Indian laws and regulations',
          ]}
        />
        <p className="pt-2">
          We do not sell, rent, or trade your personal information to third
          parties for marketing purposes.
        </p>
      </Section>

      <Section title="4. How We Share Your Information">
        <List
          items={[
            "Between patients and doctors — when you book an appointment, your name and contact details are shared with the doctor you book with. Doctors' names, specialization, location, and availability are shown to patients.",
            'Service providers — we use Supabase (database, authentication, storage), Google Firebase (push notifications), our video consultation infrastructure provider, and our payment gateway partners to operate the app. These providers process data on our behalf under their own data protection terms.',
            'Legal requirements — we may disclose information if required by Indian law, court order, or government authority.',
          ]}
        />
      </Section>

      <Section title="5. Payments">
        <p>
          All payments made through Niraamo are processed by our third-party
          payment gateway partners. We do not collect, store, or have access
          to your card number, UPI ID, or bank account details — these are
          handled entirely by the gateway in accordance with RBI guidelines
          and the gateway's own security standards. We may retain a record
          of the transaction (amount, date, and appointment reference) for
          accounting and support purposes. See the{' '}
          <span className="font-medium text-gray-700">Refund Policy</span>{' '}
          section above for details on refund eligibility.
        </p>
      </Section>

      <Section title="6. Data Storage and Security">
        <List
          items={[
            'All data is stored securely on Supabase servers with encryption at rest and in transit',
            'Authentication is handled via secure, industry-standard session tokens',
            'We implement industry-standard security practices to protect your data from unauthorized access',
            'Only authorized team members have access to production data, and only when necessary',
            'No online platform can guarantee absolute security, but we work to keep your data safe',
          ]}
        />
      </Section>

      <Section title="7. Data Retention">
        <List
          items={[
            'Account data is retained as long as your account is active',
            'If you delete your account, your personal data is deleted within 30 days, except where retention is required by law',
            'Specific retention periods for prescriptions and appointment records are under review by our team and will be updated here once finalized',
          ]}
        />
      </Section>

      <Section title="8. Your Rights">
        <p>As a user in India, you have the right to:</p>
        <List
          items={[
            'Access the personal data we hold about you',
            'Correct inaccurate or incomplete data',
            'Delete your account and associated data',
            'Withdraw consent for location access at any time via your device settings',
            <>
              Raise a grievance by contacting us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </>,
          ]}
        />
        <p className="pt-2">We aim to respond to all requests within 30 days.</p>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          Niraamo is not intended for children under the age of 13. We do
          not knowingly collect personal information from children under 13.
          If you believe a child has provided us with their information,
          please contact us and we will delete it promptly.
        </p>
      </Section>

      <Section title="10. Location Data">
        <p>We request location permission to show you nearby doctors and enable location-based features. Location data is:</p>
        <List
          items={[
            'Only collected when the app is in use (not in the background)',
            'Never sold or shared with advertisers',
          ]}
        />
        <p className="pt-2">
          You can revoke location permission at any time in your device
          settings, though some features may not work without it.
        </p>
      </Section>

      <Section title="11. Video Consultations">
        <p>
          Camera and microphone access is only requested when you choose to
          join a video consultation. Video and audio during consultations are
          transmitted through our video infrastructure provider solely to
          connect you with your doctor in real time, and are not recorded or
          stored by Niraamo unless you are explicitly notified otherwise.
        </p>
      </Section>

      <Section title="12. AI Assistant">
        <p>
          Our AI assistant uses the queries you enter to provide general
          guidance and doctor recommendations. It does not replace
          professional medical advice, and your conversations may be
          processed by our AI service provider to generate responses.
        </p>
      </Section>

      <Section title="13. Push Notifications">
        <p>
          We send push notifications for appointment reminders, queue
          updates, and prescription availability. You can disable
          notifications at any time in your device settings.
        </p>
      </Section>

      <Section title="14. Third-Party Services">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left border-collapse mt-2 text-xs">
            <thead>
              <tr className="border-b border-emerald-200">
                <th className="py-2 pr-3 font-semibold tracking-tight text-gray-700">Service</th>
                <th className="py-2 pr-3 font-semibold tracking-tight text-gray-700">Purpose</th>
                <th className="py-2 font-semibold tracking-tight text-gray-700">Policy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-emerald-100">
                <td className="py-2 pr-3">Supabase</td>
                <td className="py-2 pr-3">DB, auth, storage</td>
                <td className="py-2">
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    supabase.com/privacy
                  </a>
                </td>
              </tr>
              <tr className="border-b border-emerald-100">
                <td className="py-2 pr-3">Firebase</td>
                <td className="py-2 pr-3">Push notifications</td>
                <td className="py-2">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    policies.google.com
                  </a>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Gemini</td>
                <td className="py-2 pr-3">AI assistant</td>
                <td className="py-2">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    policies.google.com
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="15. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will update the "Last Updated" date at the top and notify you via
          the app. Continued use of Niraamo after changes means you accept
          the updated policy.
        </p>
      </Section>

      <Section title="16. Contact Us">
        <p>
          Email:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
            {SUPPORT_EMAIL}
          </a>
          <br />
          Address: India
        </p>
      </Section>
    </div>
  );
}

function TermsContent() {
  return (
    <div>
      <p className="font-normal text-sm text-gray-600 leading-relaxed mb-5">
        These Terms of Service ("Terms") govern your use of the Niraamo
        website and mobile application (together, the "Platform"). By
        creating an account or using Niraamo, you agree to these Terms. If
        you do not agree, please do not use the Platform.
      </p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Niraamo, you confirm that you are at least
          13 years of age (or using the Platform under the supervision of a
          parent or guardian) and agree to be bound by these Terms of
          Service.
        </p>
      </Section>

      <Section title="2. Use of the Platform">
        <p>
          Niraamo facilitates appointment booking, live queue tracking,
          video consultations, home-visit scheduling, and digital
          prescriptions between patients and doctors in India. You agree to
          provide accurate registration information and to use the Platform
          only for lawful purposes.
        </p>
      </Section>

      <Section title="3. Medical Disclaimer">
        <p>
          Niraamo is a technology platform that connects patients and
          doctors — it does not itself provide medical advice, diagnosis, or
          treatment. All medical advice, diagnoses, prescriptions, and
          treatment decisions are the sole responsibility of the treating,
          independently licensed doctor. Our AI assistant provides general
          guidance only and is not a substitute for professional medical
          advice. In a medical emergency, contact emergency services
          directly rather than relying on the app.
        </p>
      </Section>

      <Section title="4. Video Consultations">
        <p>
          Video consultations are offered as a convenience feature connecting
          patients with doctors remotely. You are responsible for ensuring a
          stable internet connection and a private environment during calls.
          Occasional technical interruptions may affect call quality and are
          not guaranteed to be free of disruption.
        </p>
      </Section>

      <Section title="5. Digital Prescriptions">
        <p>
          Prescriptions issued through Niraamo are generated by the treating
          doctor and are the doctor's professional responsibility. Niraamo
          only provides the platform through which prescriptions are
          delivered and stored for patient access.
        </p>
      </Section>

      <Section title="6. Account Responsibility">
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activity that occurs under your
          account. Notify us immediately if you suspect unauthorized use of
          your account.
        </p>
      </Section>

      <Section title="7. Payments and Fees">
        <p>
          Consultation fees are set by individual doctors and are displayed
          before you confirm a booking. Payments are processed securely by
          our third-party payment gateway partners; Niraamo does not store
          your payment details. By making a payment through the Platform,
          you also agree to the{' '}
          <span className="font-medium text-gray-700">Refund Policy</span>{' '}
          section above, which governs cancellations and refund eligibility.
        </p>
      </Section>

      <Section title="8. Doctor Conduct and Verification">
        <p>
          Doctors listed on Niraamo are required to provide accurate medical
          registration and qualification details at the time of onboarding.
          While we take reasonable steps to verify this information, Niraamo
          does not independently practice medicine and is not responsible
          for the clinical judgment or conduct of any doctor using the
          Platform.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          Niraamo is not liable for any indirect, incidental, or
          consequential damages arising from use of the Platform, including
          but not limited to reliance on information provided by doctors
          through the app, to the fullest extent permitted under applicable
          Indian law.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          We may suspend or terminate access to your account if you violate
          these Terms or misuse the Platform. You may also delete your
          account at any time, as described in our Privacy Policy.
        </p>
      </Section>

      <Section title="11. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the
          Platform after changes are posted constitutes acceptance of the
          revised Terms.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>
          For any questions about these Terms of Service, contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function RefundContent() {
  return (
    <div>
      <p className="font-normal text-sm text-gray-600 leading-relaxed mb-5">
        We want you to feel confident booking appointments through Niraamo.
        This Refund Policy explains when you're eligible for a refund on
        payments made through the Platform.
      </p>

      <Section title="1. Full Refund — Eligible Situations">
        <p>You will receive 100% of your payment back if:</p>
        <List
          items={[
            'The doctor accepts your appointment but later cancels it',
            'The doctor never accepts your appointment request',
            'You cancel your appointment at least 2 hours before the scheduled time',
            'The doctor does not show up for an appointment they had accepted',
          ]}
        />
      </Section>

      <Section title="2. No Refund — Situations">
        <p>Your payment will not be refunded if:</p>
        <List
          items={[
            'You do not show up for an appointment the doctor has accepted',
          ]}
        />
      </Section>

      <Section title="3. Refund Timeline">
        <p>
          Approved refunds are processed within 5–7 business days, subject to
          your bank or payment provider's own processing time.
        </p>
      </Section>

      <Section title="4. How to Request a Refund">
        <p>
          Use the Cancel Appointment option within the app, or contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="5. Other Situations">
        <p>
          If you experience a technical issue — for example, a payment error,
          or a video consultation that fails to connect — please contact us
          at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 font-medium hover:underline">
            {SUPPORT_EMAIL}
          </a>{' '}
          and we'll review your case individually.
        </p>
      </Section>

      <Section title="6. Changes to This Policy">
        <p>
          We may update this Refund Policy from time to time as our payment
          systems evolve. Changes will update the "Last Updated" date at the
          top of this page and will be notified in-app.
        </p>
      </Section>
    </div>
  );
}