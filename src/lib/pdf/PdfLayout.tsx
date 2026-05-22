import { ReactNode } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { colors, fonts } from './pdfBrand';

// ── Stylesheet ────────────────────────────────────────────────────────────────

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    paddingTop: 110, // banner (84) + breathing room
    paddingBottom: 72, // room for footer
    paddingHorizontal: 50,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.bodyText,
    lineHeight: 1.6,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: colors.linen,
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  bannerDivider: {
    position: 'absolute',
    top: 84,
    left: 0,
    right: 0,
    height: 1.25,
    backgroundColor: colors.gold,
  },
  logo: {
    width: 200,
    height: 50,
    objectFit: 'contain',
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.deepForest,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.mutedText,
    marginBottom: 16,
  },
  intro: {
    fontSize: 10.5,
    color: colors.bodyText,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  h1: {
    fontSize: 12.5,
    fontFamily: fonts.heading,
    color: colors.deepForest,
    marginTop: 18,
    marginBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.gold,
    paddingBottom: 3,
  },
  body: {
    fontSize: 10,
    color: colors.bodyText,
    lineHeight: 1.65,
    marginBottom: 7,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 12,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: colors.terracotta,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: colors.bodyText,
    lineHeight: 1.6,
  },
  highlightBox: {
    backgroundColor: colors.linenDark,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    padding: 12,
    marginVertical: 10,
  },
  highlightTitle: {
    fontFamily: fonts.heading,
    color: colors.terracotta,
    fontSize: 10,
    marginBottom: 4,
  },
  highlightBody: {
    fontSize: 10,
    color: colors.bodyText,
    lineHeight: 1.6,
    marginBottom: 5,
  },
  acknowledgement: {
    borderTopWidth: 0.75,
    borderTopColor: colors.gold,
    marginTop: 24,
    paddingTop: 14,
  },
  acknowledgementTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.deepForest,
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 50,
    right: 50,
    borderTopWidth: 0.5,
    borderTopColor: colors.gold,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: colors.mutedText,
  },
});

// ── Primitives ───────────────────────────────────────────────────────────────

export function H1({ children }: { children: ReactNode }) {
  return <Text style={pdfStyles.h1}>{children}</Text>;
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={pdfStyles.body}>{children}</Text>;
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={pdfStyles.bullet} wrap={false}>
      <Text style={pdfStyles.bulletDot}>•</Text>
      <Text style={pdfStyles.bulletText}>{children}</Text>
    </View>
  );
}

export function HighlightBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={pdfStyles.highlightBox} wrap={false}>
      {title && <Text style={pdfStyles.highlightTitle}>{title}</Text>}
      {children}
    </View>
  );
}

export function HighlightP({ children }: { children: ReactNode }) {
  return <Text style={pdfStyles.highlightBody}>{children}</Text>;
}

// ── Page wrapper ─────────────────────────────────────────────────────────────

interface BrandedDocProps {
  title: string;
  logoSrc: Buffer;
  children: ReactNode;
}

export function BrandedDoc({ title, logoSrc, children }: BrandedDocProps) {
  // @react-pdf reliably renders Buffer images when passed as { data, format }
  const logoImg = { data: logoSrc, format: 'png' as const };

  return (
    <Document title={title} author="Owen Lynch Psychotherapy">
      <Page size="A4" style={pdfStyles.page}>
        {/* Cream banner with logo — fixed so it repeats on every page */}
        <View style={pdfStyles.banner} fixed>
          <Image src={logoImg} style={pdfStyles.logo} />
        </View>
        <View style={pdfStyles.bannerDivider} fixed />

        {children}

        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Owen Lynch Psychotherapy · owenlynchtherapy.com · IAHIP &amp; ICP Accredited
          </Text>
          <Text
            style={pdfStyles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
