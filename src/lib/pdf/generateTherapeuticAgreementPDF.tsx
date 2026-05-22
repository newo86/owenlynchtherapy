import { renderToBuffer, View, Text } from '@react-pdf/renderer';
import { BrandedDoc, H1, P, Bullet, HighlightBox, HighlightP, pdfStyles } from './PdfLayout';
import { loadHorizontalLogoPng } from './loadLogo';

export async function generateTherapeuticAgreementPDF(): Promise<Buffer> {
  const logo = await loadHorizontalLogoPng();

  return renderToBuffer(
    <BrandedDoc title="Client Information & Therapeutic Agreement" logoSrc={logo}>
      <Text style={pdfStyles.title}>Client Information &amp; Therapeutic Agreement</Text>

      <View style={{ height: 14 }} />

      <Text style={pdfStyles.intro}>
        Please read this document carefully before our first session. It outlines
        how we will work together, what you can expect from therapy, and some
        important practical information. If you have any questions about anything
        here, please bring them to our first meeting.
      </Text>

      {/* 1 */}
      <H1>1. About the Therapy</H1>
      <P>
        I work as an integrative psychotherapist, drawing primarily from psychodynamic
        and person-centred approaches. This means I work with what is happening in
        the present and how past experiences may be shaping current patterns of
        thinking, feeling, and relating. I also draw on Cognitive Behavioural
        Therapy (CBT) and Acceptance and Commitment Therapy (ACT) where these
        are helpful.
      </P>
      <P>
        Therapy is a collaborative process. I will offer you a safe, confidential,
        and non-judgmental space to explore whatever is troubling you. I will
        support you fully and, where appropriate, challenge you — not to judge,
        but to help you grow.
      </P>
      <P>
        Therapy does not come with guarantees. What I can offer is a consistent,
        honest, and professionally grounded relationship within which meaningful
        change becomes possible.
      </P>

      {/* 2 */}
      <H1>2. Sessions</H1>
      <P>Sessions are 50 minutes in duration. They take place:</P>
      <Bullet>In person at: Insight Matters, 106 Capel Street, Dublin, D01 WY40</Bullet>
      <Bullet>
        Online via doxy.me, a secure and confidential video platform designed
        for healthcare professionals
      </Bullet>
      <View style={{ height: 6 }} />
      <P>
        Sessions are typically weekly, particularly at the beginning of the work.
        We may review frequency as the therapy progresses.
      </P>

      {/* 3 */}
      <H1>3. Fees &amp; Cancellation Policy</H1>
      <P>
        My fee per session is agreed individually with each client. Payment is
        due in advance of each session.
      </P>
      <P>Cancellation policy:</P>
      <Bullet>More than 48 hours&rsquo; notice: no charge</Bullet>
      <Bullet>Between 48 and 24 hours&rsquo; notice: the room hire cost will be charged</Bullet>
      <Bullet>Less than 24 hours&rsquo; notice: the full session fee is charged</Bullet>
      <View style={{ height: 6 }} />
      <P>
        These charges exist because late cancellations leave time that cannot
        usually be filled, and I have already committed to holding that time for you.
      </P>

      {/* 4 */}
      <H1>4. Contact Between Sessions</H1>
      <P>
        Outside of our session time, I am available for administrative contact
        only — for example, to confirm or reschedule appointments. I am not
        available for therapeutic support between sessions.
      </P>
      <P>
        In the event of an emergency, you may contact me, though I may not be
        able to respond immediately or outside of business hours. If you are
        experiencing a mental health crisis or medical emergency, please contact
        emergency services (999 or 112), your GP, the Samaritans (116 123), or
        attend your nearest Emergency Department.
      </P>
      <P>
        Therapy works best when the therapeutic relationship is maintained within
        the session space. This boundary is there to protect the integrity of our
        work together, not to leave you without support.
      </P>

      {/* 5 */}
      <H1>5. Confidentiality &amp; Its Limits</H1>
      <P>
        Everything you share in therapy is confidential. I will not discuss the
        content of our sessions with anyone without your explicit consent.
      </P>
      <P>
        There are, however, limits to confidentiality. The circumstances in which
        confidentiality may need to be broken are:
      </P>
      <Bullet>
        If I believe there is a serious and imminent risk to your life or the
        life of another person
      </Bullet>
      <Bullet>
        If I receive information that a child or vulnerable adult is at risk of harm
      </Bullet>
      <Bullet>If I am required to do so by a court of law</Bullet>

      <HighlightBox title="Important">
        <HighlightP>
          If a situation arises where confidentiality may need to be broken, this
          process will always be discussed with you first wherever possible. You
          will normally be involved at every step of the way. These situations are
          evaluated on a case-by-case basis in accordance with current Irish law
          and professional guidelines, and the process can take weeks or even years.
          It is rarely, if ever, a sudden or unilateral decision.
        </HighlightP>
        <HighlightP>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Emergency contact: </Text>
          In situations where I have serious concerns for your safety or the safety
          of another person and I am unable to reach you directly, I may contact
          your emergency contact as a first step. This would only occur in genuinely
          urgent circumstances and would always be done with your wellbeing as the
          primary consideration. This is one of the reasons we ask for emergency
          contact details on the intake form.
        </HighlightP>
      </HighlightBox>

      <P>
        I work under regular clinical supervision. This means I discuss my work
        confidentially with a qualified supervisor, as required by my professional
        accreditation bodies (IAHIP and ICP). Your identity is protected in
        supervision.
      </P>

      {/* 6 */}
      <H1>6. Notes &amp; Records</H1>
      <P>
        I keep brief clinical notes following sessions. All notes, whether paper
        or digital, are password protected and stored securely.
      </P>
      <P>
        My notes focus on general themes rather than detailed personal information.
        For example, a note might read: &lsquo;client spoke about family.&rsquo; In
        situations where there may be a risk to the life of the client or another
        person, notes may be more detailed in order to properly document the
        concern and any action taken.
      </P>
      <P>
        Notes are kept as required by my professional indemnity insurance and
        accreditation bodies. They are not shared with third parties except in
        the limited circumstances described in Section 5.
      </P>
      <P>
        You have the right to request access to information held about you. Please
        see the Privacy Policy on my website for full details:
        owenlynchtherapy.com/privacy
      </P>

      {/* 7 */}
      <H1>7. Handouts &amp; Therapeutic Materials</H1>
      <P>
        From time to time I may share handouts, worksheets, or other written
        materials as part of our work together. These are provided for your
        personal use only. They may not be reproduced, shared, distributed, or
        published in any form without my prior written consent.
      </P>
      <P>
        This includes sharing digitally — for example, by photographing, scanning,
        forwarding by email, or posting online. The materials are intended to
        support your individual therapeutic process and are not designed for
        general distribution.
      </P>

      {/* 8 */}
      <H1>8. If We Meet Outside of Therapy</H1>
      <P>
        It is possible that we may encounter each other in public — in a shop,
        at an event, or elsewhere. To protect your confidentiality, I will not
        acknowledge you or initiate contact in public unless you choose to
        approach me first.
      </P>
      <P>
        If you do choose to say hello, I will always respond warmly — but I will
        keep any interaction brief. I will not engage in conversation beyond a
        simple greeting, and I will not introduce you to anyone I am with or give
        any indication of the nature of our relationship. This is to protect your
        privacy, not to be dismissive.
      </P>
      <P>
        I would also ask that you respect my privacy if we meet when I am with
        other people. A simple nod or hello is always welcome, but please do not
        feel any obligation to acknowledge me, and equally I would ask that any
        interaction remains brief. There will not be a conversation.
      </P>
      <P>
        If an encounter outside of therapy feels significant or unsettling for
        you in any way, please do bring it to our next session. These moments can
        sometimes be meaningful and worth exploring.
      </P>

      {/* 9 */}
      <H1>9. Social Media &amp; Online Contact</H1>
      <P>
        You are welcome to follow my professional online accounts — these are
        linked from owenlynchtherapy.com and contain articles, resources, and
        general content related to mental health and therapy. Following these
        accounts is entirely optional and will have no bearing on our therapeutic
        work.
      </P>
      <P>
        I do not accept friend or connection requests from current or former
        clients on my personal social media accounts. This boundary exists to
        maintain the integrity of the therapeutic relationship and to protect
        your confidentiality — not as a personal slight.
      </P>
      <P>
        If you interact with my professional content publicly (for example, by
        liking or commenting on a post), please be aware that this may be visible
        to others. You are of course under no obligation to engage with any of my
        online content.
      </P>

      {/* 10 */}
      <H1>10. Ending Therapy</H1>
      <P>
        You are free to end therapy at any time. Where possible, I would encourage
        giving some notice so that we can have an ending session together. A
        planned ending is often an important part of the therapeutic process.
      </P>
      <P>
        I may also, on rare occasions, need to end the therapeutic relationship —
        for example, if I believe a different form of support would better meet
        your needs. If this were ever the case, I would discuss it with you openly
        and support you in finding an appropriate referral.
      </P>

      {/* 11 */}
      <H1>11. Professional Accreditation &amp; Complaints</H1>
      <P>
        I am accredited by the Irish Association for Humanistic and Integrative
        Psychotherapy (IAHIP) and the Irish Council for Psychotherapy (ICP). I
        adhere to their codes of ethics and practice.
      </P>
      <P>
        If you have a concern about my practice, I would always encourage you to
        raise it with me directly in the first instance. If you feel unable to
        do so, or if your concern remains unresolved, you have the right to make
        a formal complaint to:
      </P>
      <Bullet>
        IAHIP — Irish Association for Humanistic and Integrative Psychotherapy:
        iahip.org
      </Bullet>
      <Bullet>ICP — Irish Council for Psychotherapy: psychotherapycouncil.ie</Bullet>
      <View style={{ height: 6 }} />
      <P>
        Both organisations have formal complaints procedures and can be contacted
        directly through their websites.
      </P>

      {/* Acknowledgement */}
      <View style={pdfStyles.acknowledgement} wrap={false}>
        <Text style={pdfStyles.acknowledgementTitle}>Acknowledgement</Text>
        <P>
          By proceeding with therapy, you confirm that you have read and understood
          this document and agree to work within these terms. If you have any
          questions, please raise them before or during your first session.
        </P>
        <Text style={{ fontSize: 9, color: '#888', fontStyle: 'italic', marginTop: 4 }}>
          Note: Your agreement to these terms is recorded via the consent checkboxes
          on your intake form.
        </Text>
      </View>
    </BrandedDoc>
  );
}
