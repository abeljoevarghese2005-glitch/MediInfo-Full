import { useState } from 'react';

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <div className="min-h-screen bg-green-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Privacy Policy & Terms of Service
          </h1>
          <p className="mt-2 font-normal text-white/90">
            {activeTab === 'privacy'
              ? 'Effective Date: June 13, 2025 · Last Updated: June 13, 2025'
              : 'Last Updated: June 13, 2025'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="flex gap-2 border-b border-emerald-200">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 font-semibold tracking-tight transition-colors ${
              activeTab === 'privacy'
                ? 'text-emerald-700 border-b-2 border-emerald-700'
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 font-semibold tracking-tight transition-colors ${
              activeTab === 'terms'
                ? 'text-emerald-700 border-b-2 border-emerald-700'
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            Terms of Service
          </button>
        </div>

        {/* Content card */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 my-6 hover:bg-green-50 transition-colors">
          {activeTab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-tight text-gray-800 mb-2">
        {title}
      </h2>
      <div className="font-normal text-gray-600 leading-relaxed space-y-2">
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
      <p className="font-normal text-gray-600 leading-relaxed mb-6">
        MediInfo ("we", "our", or "us") is a healthcare technology platform
        that connects patients with doctors, enabling appointment booking,
        live queue tracking, digital prescriptions, and video consultations.
        This Privacy Policy explains how we collect, use, store, and protect
        your information when you use the MediInfo mobile application (the
        "App"). By using MediInfo, you agree to the collection and use of
        information as described in this policy.
      </p>

      <Section title="1. Who We Are">
        <p>
          MediInfo is operated by the MediInfo team, currently serving users
          in India. For any privacy-related queries, contact us at{' '}
          <a href="mailto:privacy@mediinfo.app" className="text-emerald-600 font-medium hover:underline">
            privacy@mediinfo.app
          </a>
          .
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p className="font-medium text-gray-700">Information you provide directly:</p>
        <List
          items={[
            'Account details — name, email address, phone number, and password when you register',
            "Profile information — for patients: age, gender, and basic health details you choose to add. For doctors: medical registration number, specialization, clinic/hospital name, and location",
            'Appointment data — doctor preferences, booking history, appointment notes, and consultation type (in-clinic or video)',
            'Prescription data — digital prescriptions issued by doctors through the app',
          ]}
        />
        <p className="font-medium text-gray-700 pt-2">Information collected automatically:</p>
        <List
          items={[
            'Location data — your approximate location (with permission) to show nearby doctors and enable the live queue feature, only while the app is in use',
            'Device information — device type, OS version, and app version for debugging and performance',
            'Usage data — pages visited and features used, to improve the app experience',
          ]}
        />
        <p className="font-medium text-gray-700 pt-2">Information we do NOT collect:</p>
        <List
          items={[
            'We do not collect payment or financial information',
            'We do not store medical records, lab reports, or imaging files',
            'We do not access your contacts, camera, or microphone unless a feature you initiate requires it — for example, joining a video consultation',
          ]}
        />
      </Section>

      <Section title="3. How We Use Your Information">
        <List
          items={[
            'Create and manage your account',
            'Match patients with nearby available doctors',
            'Enable appointment booking and live queue tracking',
            'Enable video consultations between patients and doctors',
            'Allow doctors to issue and patients to access digital prescriptions',
            'Send appointment reminders and notifications',
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
            'Service providers — we use Supabase (database and authentication) and Firebase (push notifications) to operate the app, along with a video infrastructure provider to enable video consultations. These providers process data on our behalf under strict data protection agreements.',
            'Legal requirements — we may disclose information if required by Indian law, court order, or government authority.',
          ]}
        />
      </Section>

      <Section title="5. Data Storage and Security">
        <List
          items={[
            'All data is stored securely on Supabase servers with encryption at rest and in transit',
            'Authentication is handled via secure JWT tokens',
            'We implement industry-standard security practices to protect your data from unauthorized access',
            'Only authorized team members have access to production data, and only when necessary',
          ]}
        />
      </Section>

      <Section title="6. Data Retention">
        <List
          items={[
            'Account data is retained as long as your account is active',
            'If you delete your account, your personal data is deleted within 30 days, except where retention is required by law',
            'Prescription records are retained for the minimum period required under applicable Indian medical regulations',
          ]}
        />
      </Section>

      <Section title="7. Your Rights">
        <p>As a user in India, you have the right to:</p>
        <List
          items={[
            'Access the personal data we hold about you',
            'Correct inaccurate or incomplete data',
            'Delete your account and associated data',
            'Withdraw consent for location access at any time via your device settings',
            'Raise a grievance by contacting us at privacy@mediinfo.app',
          ]}
        />
        <p className="pt-2">We will respond to all requests within 30 days.</p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>
          MediInfo is not intended for children under the age of 13. We do
          not knowingly collect personal information from children under 13.
          If you believe a child has provided us with their information,
          please contact us and we will delete it promptly.
        </p>
      </Section>

      <Section title="9. Location Data">
        <p>We request location permission to show you nearby doctors and enable queue features. Location data is:</p>
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

      <Section title="10. Video Consultations">
        <p>
          Camera and microphone access is only requested when you choose to
          join a video consultation. Video and audio during consultations are
          transmitted through our video infrastructure provider solely to
          connect you with your doctor in real time, and are not recorded or
          stored by MediInfo unless you are explicitly notified otherwise.
        </p>
      </Section>

      <Section title="11. Push Notifications">
        <p>
          We send push notifications for appointment reminders, queue
          updates, and prescription availability. You can disable
          notifications at any time in your device settings.
        </p>
      </Section>

      <Section title="12. Third-Party Services">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse mt-2">
            <thead>
              <tr className="border-b border-emerald-200">
                <th className="py-2 pr-4 font-semibold tracking-tight text-gray-700">Service</th>
                <th className="py-2 pr-4 font-semibold tracking-tight text-gray-700">Purpose</th>
                <th className="py-2 font-semibold tracking-tight text-gray-700">Privacy Policy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-emerald-100">
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">Database, authentication, storage</td>
                <td className="py-2">
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    supabase.com/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Firebase (Google)</td>
                <td className="py-2 pr-4">Push notifications</td>
                <td className="py-2">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    policies.google.com/privacy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="13. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will update the "Last Updated" date at the top and notify you via
          the app. Continued use of MediInfo after changes means you accept
          the updated policy.
        </p>
      </Section>

      <Section title="14. Contact Us">
        <p>For any questions, concerns, or requests regarding this Privacy Policy:</p>
        <p>
          Email:{' '}
          <a href="mailto:privacy@mediinfo.app" className="text-emerald-600 font-medium hover:underline">
            privacy@mediinfo.app
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
      <p className="font-normal text-gray-600 leading-relaxed mb-6">
        These Terms of Service ("Terms") govern your use of the MediInfo
        mobile application. By creating an account or using MediInfo, you
        agree to these Terms. If you do not agree, please do not use the app.
      </p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using MediInfo, you confirm that you are at least
          13 years of age (or using the app under the supervision of a parent
          or guardian) and agree to be bound by these Terms of Service.
        </p>
      </Section>

      <Section title="2. Use of the Platform">
        <p>
          MediInfo facilitates appointment booking, live queue tracking,
          video consultations, and digital prescriptions between patients and
          doctors in India. You agree to provide accurate registration
          information and to use the platform only for lawful purposes.
        </p>
      </Section>

      <Section title="3. Medical Disclaimer">
        <p>
          MediInfo is a technology platform that connects patients and
          doctors — it does not itself provide medical advice, diagnosis, or
          treatment. All medical advice, diagnoses, prescriptions, and
          treatment decisions are the sole responsibility of the treating,
          independently licensed doctor. In a medical emergency, contact
          emergency services directly rather than relying on the app.
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
          Prescriptions issued through MediInfo are generated by the treating
          doctor and are the doctor's professional responsibility. MediInfo
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

      <Section title="7. No Payments Through the App">
        <p>
          MediInfo is free to download and use for patients. The app does not
          process payments or financial transactions at this time.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          MediInfo is not liable for any indirect, incidental, or
          consequential damages arising from use of the platform, including
          but not limited to reliance on information provided by doctors
          through the app, to the fullest extent permitted under applicable
          Indian law.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          We may suspend or terminate access to your account if you violate
          these Terms or misuse the platform. You may also delete your
          account at any time, as described in our Privacy Policy.
        </p>
      </Section>

      <Section title="10. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the
          platform after changes are posted constitutes acceptance of the
          revised Terms.
        </p>
      </Section>

      <Section title="11. Contact Us">
        <p>
          For any questions about these Terms of Service, contact us at{' '}
          <a href="mailto:privacy@mediinfo.app" className="text-emerald-600 font-medium hover:underline">
            privacy@mediinfo.app
          </a>
          .
        </p>
      </Section>
    </div>
  );
}