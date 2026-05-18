import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/ui/mobile-bottom-nav';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* pb-20 on mobile accounts for the fixed bottom nav height */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <hr style={{ borderColor: '#D4A843', borderTopWidth: '1px', margin: 0 }} />
      <Footer />
      <MobileBottomNav />
    </>
  );
}
