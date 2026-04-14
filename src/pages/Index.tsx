import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Featured from "@/components/Featured";
import Spaces from "@/components/Spaces";
import HallMap from "@/components/HallMap";
import Promo from "@/components/Promo";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Featured />
      <Spaces />
      <HallMap />
      <Promo />
      <Footer />
    </main>
  );
};

export default Index;