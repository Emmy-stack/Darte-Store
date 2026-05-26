'use client'

import Link from 'next/link'

const Section = ({ title, children }) => (
  <section>
    <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
    <div className="mt-3 space-y-3 leading-7">{children}</div>
  </section>
)

const SubSection = ({ title, children }) => (
  <div>
    <h3 className="text-lg font-medium text-slate-800">{title}</h3>
    <div className="mt-2 space-y-3">{children}</div>
  </div>
)

const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[70vh] mx-6 py-12 text-slate-700">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">Darté Privacy Policy</h1>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">
            This Privacy Policy explains how Darté collects, uses, stores, and protects your personal information when you use our platform.
          </p>
        </div>

        <div className="space-y-8 text-slate-600">
          <Section title="1. About This Privacy Policy">
            <p>
              This Privacy Policy explains how Darté collects, uses, stores, and protects your personal information when you use our website,
              mobile applications, services, social media pages, and other platforms connected to Darté.
            </p>
            <p>By using Darté, you agree to the collection and use of your information in accordance with this Privacy Policy.</p>
          </Section>

          <Section title="2. Who We Are">
            <p>
              Darté is an e-commerce marketplace that connects buyers and sellers for the purchase and sale of products including fashion items,
              gadgets, jewelry, gifts, and other products.
            </p>
            <p>Our platform also includes:</p>
            <List
              items={[
                'Marketplace services for buyers and sellers',
                'Payment processing services',
                'Delivery and logistics support',
                'Customer support services',
                'Marketing and promotional services',
              ]}
            />
            <p>Darté is responsible for processing and protecting the personal data collected through our platform.</p>
          </Section>

          <Section title="3. Information We Collect">
            <SubSection title="A. Information You Provide to Us">
              <p>We collect information you provide directly when you:</p>
              <List
                items={[
                  'Create an account',
                  'Place an order',
                  'Become a seller',
                  'Contact customer support',
                  'Participate in promotions or surveys',
                  'Subscribe to newsletters or marketing communications',
                ]}
              />
              <p>This information may include:</p>
              <List
                items={[
                  'Full name',
                  'Email address',
                  'Phone number',
                  'Delivery and billing addresses',
                  'Profile pictures',
                  'Password and login credentials',
                  'Payment details',
                  'Bank account details for sellers',
                  'Business information for seller accounts',
                  'Messages sent through the platform',
                  'Product reviews and ratings',
                ]}
              />
            </SubSection>

            <SubSection title="B. Information We Automatically Collect">
              <p>When you use Darté, we may automatically collect:</p>
              <List
                items={[
                  'IP address',
                  'Device information',
                  'Browser type',
                  'Operating system',
                  'App usage data',
                  'Search history',
                  'Purchase history',
                  'Wishlist and cart activity',
                  'Pages viewed and time spent on pages',
                  'Cookies and tracking information',
                  'Location information (where permitted)',
                ]}
              />
            </SubSection>

            <SubSection title="C. Information from Third Parties">
              <p>We may receive information from:</p>
              <List
                items={[
                  'Payment providers',
                  'Delivery partners',
                  'Marketing and advertising partners',
                  'Social media platforms',
                  'Identity verification services',
                  'Fraud prevention services',
                ]}
              />
            </SubSection>
          </Section>

          <Section title="4. Cookies and Tracking Technologies">
            <p>Darté uses cookies and similar technologies to:</p>
            <List
              items={[
                'Keep you logged in',
                'Remember your preferences',
                'Improve website performance',
                'Analyze traffic and user behavior',
                'Personalize your shopping experience',
                'Deliver relevant advertisements',
              ]}
            />
            <p>
              You may disable cookies in your browser settings, but some features of Darté may not function properly.
            </p>
          </Section>

          <Section title="5. How We Use Your Information">
            <p>We use your personal information to:</p>
            <List
              items={[
                'Create and manage your account',
                'Process and deliver orders',
                'Handle payments and refunds',
                'Provide customer support',
                'Verify seller accounts',
                'Improve our products and services',
                'Personalize recommendations',
                'Send updates and promotional messages',
                'Detect fraud and suspicious activity',
                'Enforce our terms and policies',
                'Comply with legal obligations',
              ]}
            />
          </Section>

          <Section title="6. Legal Basis for Processing">
            <p>We process your personal data based on:</p>
            <List
              items={[
                'Your consent',
                'Performance of a contract',
                'Legal obligations',
                'Legitimate business interests',
                'Fraud prevention and security purposes',
              ]}
            />
            <p>You may withdraw consent for marketing communications at any time.</p>
          </Section>

          <Section title="7. How We Share Your Information">
            <p>We may share your information with:</p>

            <SubSection title="Sellers">
              <p>To fulfill purchases, sellers may receive:</p>
              <List items={['Your name', 'Delivery address', 'Contact information', 'Order details']} />
            </SubSection>

            <SubSection title="Service Providers">
              <p>We may share information with trusted third parties that help us operate Darté, including:</p>
              <List
                items={[
                  'Payment processors',
                  'Delivery companies',
                  'Cloud hosting providers',
                  'Analytics providers',
                  'Customer support tools',
                ]}
              />
            </SubSection>

            <SubSection title="Legal Authorities">
              <p>
                We may disclose information if required by law or to protect the rights, safety, and security of Darté, our users, or others.
              </p>
            </SubSection>

            <SubSection title="Business Transfers">
              <p>
                If Darté is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>
            </SubSection>
          </Section>

          <Section title="8. Data Security">
            <p>We implement appropriate technical and organizational security measures to protect your personal data against:</p>
            <List items={['Unauthorized access', 'Data loss', 'Misuse', 'Alteration', 'Disclosure']} />
            <p>However, no online platform can guarantee absolute security.</p>
          </Section>

          <Section title="9. Data Retention">
            <p>We retain your personal data only for as long as necessary to:</p>
            <List
              items={[
                'Provide services',
                'Comply with legal obligations',
                'Resolve disputes',
                'Prevent fraud',
                'Enforce agreements',
              ]}
            />
          </Section>

          <Section title="10. Your Rights">
            <p>Depending on your location and applicable laws, you may have the right to:</p>
            <List
              items={[
                'Access your personal data',
                'Correct inaccurate information',
                'Delete your account and data',
                'Withdraw consent',
                'Object to certain processing activities',
                'Request data portability',
                'Opt out of marketing communications',
              ]}
            />
            <p>To exercise these rights, contact us through our support channels.</p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>
              Darté does not knowingly collect personal information from children under the age required by local laws. Users under the required age
              should not use our platform without parental supervision.
            </p>
          </Section>

          <Section title="12. Third-Party Links">
            <p>
              Our platform may contain links to third-party websites or services. Darté is not responsible for the privacy practices or content of
              third-party services.
            </p>
          </Section>

          <Section title="13. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.
            </p>
            <p>Continued use of Darté after updates means you accept the revised Privacy Policy.</p>
          </Section>

          <Section title="14. Contact Us">
            <p>If you have questions about this Privacy Policy or your personal data, please contact:</p>
            <p className="font-medium text-slate-800">Darté Support Team</p>
            <p>
              Email:{' '}
              <a href="mailto:darte.universe@gmail.com" className="text-green-600 hover:underline">
                darte.universe@gmail.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-slate-800 px-6 py-3 text-white hover:bg-slate-900 transition"
          >
            Back to Shop
          </Link>
          <p className="text-sm text-slate-500">Last updated: May 2026.</p>
        </div>
      </div>
    </div>
  )
}
