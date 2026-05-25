import Link from 'next/link';

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const inlineLink =
  'underline underline-offset-2 decoration-orange/60 h-hover:decoration-orange h-can:transition-colors';

export default function ServiceHowSessionsWork() {
  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
      aria-labelledby="how-sessions-work-heading"
    >
      <div className="max-w-4xl mx-auto">
        <div className="max-w-[720px] mx-auto">
          <h2
            id="how-sessions-work-heading"
            className="font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-0 mb-5 leading-snug"
          >
            How sessions work
          </h2>
          <p className={p}>
            Sessions are 50 minutes and take place in person at Insight Matters, 106 Capel Street,
            Dublin 1, or online via secure video for clients across Ireland and the UK. Fees are €80
            in person and €70 online. I work with adults only.
          </p>
          <p className={p}>
            There&apos;s no fixed programme — we work at a pace that feels right for you. Some
            people come for a few sessions with something specific in mind. Others work longer term.
            It&apos;s your call.
          </p>
          <p className={p}>
            If you&apos;re not sure whether therapy is right for you, or whether I&apos;m the right
            fit, feel free to{' '}
            <Link href="/contact" className={inlineLink}>
              get in touch
            </Link>
            . There&apos;s no pressure — it&apos;s just a conversation.
          </p>
        </div>
      </div>
    </section>
  );
}
