import { ReactNode } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { colors, fonts } from './pdfBrand';

// ── Stylesheet ────────────────────────────────────────────────────────────────

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.linen,
    paddingTop: 44,
    paddingBottom: 72, // room for footer
    paddingHorizontal: 50,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.bodyText,
    lineHeight: 1.6,
  },
  logoWrap: {
    marginBottom: 6,
  },
  logo: {
    width: 200,
    height: 50,
  },
  goldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gold,
    marginTop: 4,
    marginBottom: 18,
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
  logoSrc: string | Buffer;
  children: ReactNode;
}

export function BrandedDoc({ title, logoSrc, children }: BrandedDocProps) {
  return (
    <Document title={title} author="Owen Lynch Psychotherapy">
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.logoWrap} fixed>
          {/* @react-pdf accepts Buffer | string | { data, format } for src */}
          <Image src={logoSrc as unknown as string} style={pdfStyles.logo} />
        </View>
        <View style={pdfStyles.goldDivider} fixed />

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
