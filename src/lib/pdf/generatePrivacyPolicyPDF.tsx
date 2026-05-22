import { renderToBuffer, View, Text } from '@react-pdf/renderer';
import { BrandedDoc, H1, P, Bullet, pdfStyles } from './PdfLayout';
import { loadHorizontalLogoPng } from './loadLogo';

// Static document — memoised after first render to keep welcome-email
// sends fast (saves ~2–3 s per call).
let cached: Buffer | null = null;

export async function generatePrivacyPolicyPDF(): Promise<Buffer> {
  if (cached) return cached;
  const logo = await loadHorizontalLogoPng();

  cached = await renderToBuffer(
    <BrandedDoc title="Privacy Policy — Owen Lynch Psychotherapy" logoSrc={logo}>
      <Text style={pdfStyles.title}>Privacy Policy</Text>
      <Text style={pdfStyles.subtitle}>Last updated: May 2026</Text>

      <Text style={pdfStyles.intro}>
        This privacy policy explains how Owen Lynch Psychotherapy
        (&ldquo;I&rdquo;, &ldquo;me&rdquo;, &ldquo;my&rdquo;) collects, uses,
        stores, and protects your personal data. I am committed to handling your
        information with care, transparency, and in full compliance with the
        General Data Protection Regulation (GDPR) and the Data Protection
        Acts 1988–2018.
      </Text>

      {/* 1 */}
      <H1>1. Who I Am</H1>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Data Controller: </Text>Owen Lynch
      </P>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Trading as: </Text>Owen Lynch Psychotherapy
      </P>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Website: </Text>owenlynchtherapy.com
      </P>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Email: </Text>info@owenlynchtherapy.com
      </P>

      {/* 2 */}
      <H1>2. What Data I Collect</H1>
      <P>I collect and process the following personal data:</P>
      <Bullet>Contact information: name, email address, phone number</Bullet>
      <Bullet>
        Intake form information: date of birth, pronouns, reason for seeking
        therapy, mental health history, medication, GP details, emergency contact
      </Bullet>
      <Bullet>Session records: dates, format (in person or online), notes</Bullet>
      <Bullet>
        Payment information: session fees and payment records (payment card
        details are processed by Stripe and never stored by me)
      </Bullet>
      <Bullet>Website usage data: via Google Analytics (anonymised)</Bullet>

      {/* 3 */}
      <H1>3. Legal Basis for Processing</H1>
      <P>I process your data on the following legal bases:</P>
      <Bullet>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Contract: </Text>
        to provide psychotherapy services to you
      </Bullet>
      <Bullet>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Legal obligation: </Text>
        to maintain records as required by my professional indemnity insurance
        and accreditation bodies
      </Bullet>
      <Bullet>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Consent: </Text>
        where you have explicitly agreed to the collection of sensitive health
        data via the intake form
      </Bullet>
      <Bullet>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Legitimate interests: </Text>
        for administrative purposes such as scheduling and billing
      </Bullet>

      {/* 4 */}
      <H1>4. How I Store Your Data</H1>
      <P>Your data is stored securely using the following systems:</P>
      <Bullet>
        Intake form data is stored in a secure database hosted in the Republic
        of Ireland (Supabase, EU West region)
      </Bullet>
      <Bullet>
        Appointment scheduling uses Google Calendar (Google Workspace), subject
        to Google&rsquo;s privacy policy
      </Bullet>
      <Bullet>
        Online sessions are conducted via doxy.me, a HIPAA-compliant healthcare
        video platform
      </Bullet>
      <Bullet>
        Payment processing is handled by Stripe, which is PCI DSS compliant.
        I do not store your card details
      </Bullet>
      <Bullet>Email communications are sent via Resend, using your verified domain</Bullet>
      <Bullet>
        Paper and digital clinical notes are password protected and stored
        securely. Notes focus on general themes rather than detailed personal
        information — for example, a note might read: &lsquo;client spoke about
        family.&rsquo; In situations involving a potential risk to life, notes
        may be more detailed in order to document the concern and any action taken.
      </Bullet>

      {/* 5 */}
      <H1>5. How Long I Keep Your Data</H1>
      <P>
        Clinical records are retained for a minimum of 7 years after the end of
        therapy, as required by my professional indemnity insurance. After this
        period, records are securely destroyed.
      </P>
      <P>
        If you make an enquiry but do not proceed with therapy, your contact
        details will be deleted within 12 months.
      </P>

      {/* 6 */}
      <H1>6. Your Rights</H1>
      <P>Under GDPR, you have the right to:</P>
      <Bullet>Access the personal data I hold about you</Bullet>
      <Bullet>Request correction of inaccurate data</Bullet>
      <Bullet>Request deletion of your data (subject to legal retention requirements)</Bullet>
      <Bullet>Object to processing or request restriction of processing</Bullet>
      <Bullet>Withdraw consent at any time (where consent is the legal basis)</Bullet>
      <Bullet>Lodge a complaint with the Data Protection Commission (dataprotection.ie)</Bullet>
      <View style={{ height: 6 }} />
      <P>
        To exercise any of these rights, please contact me at info@owenlynchtherapy.com.
      </P>

      {/* 7 */}
      <H1>7. Sharing Your Data</H1>
      <P>
        I do not sell, rent, or share your personal data with third parties for
        marketing purposes. Your data will not be disclosed to any third party
        except:
      </P>
      <Bullet>With your explicit consent (e.g. a referral letter to your GP)</Bullet>
      <Bullet>Where I am legally required to do so</Bullet>
      <Bullet>In clinical supervision, where your identity is protected</Bullet>

      {/* 8 */}
      <H1>8. Cookies &amp; Website Analytics</H1>
      <P>
        My website uses Google Analytics to understand how visitors use the
        site. This data is anonymised and does not identify you personally.
        You can opt out of Google Analytics tracking via your browser settings
        or by using the Google Analytics Opt-out Browser Add-on.
      </P>

      {/* 9 */}
      <H1>9. Changes to This Policy</H1>
      <P>
        I may update this policy from time to time. The current version will
        always be available at owenlynchtherapy.com/privacy. If significant
        changes are made, I will notify current clients by email.
      </P>

      {/* 10 */}
      <H1>10. Contact</H1>
      <P>
        If you have any questions about this privacy policy or how I handle your
        data, please contact:
      </P>
      <View style={{ height: 4 }} />
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Owen Lynch</Text>
      </P>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Email: </Text>info@owenlynchtherapy.com
      </P>
      <P>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Website: </Text>owenlynchtherapy.com
      </P>
    </BrandedDoc>
  );
  return cached;
}
