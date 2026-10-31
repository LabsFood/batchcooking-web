import Hero from '@/components/home/Hero'
import Concept from '@/components/home/Concept'
import FoodCarousel from '@/components/home/FoodCarousel'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedMenu from '@/components/home/FeaturedMenu'
import TaxCreditBanner from '@/components/home/TaxCreditBanner'
import ServiceArea from '@/components/home/ServiceArea'
import Testimonials from '@/components/home/Testimonials'
import FAQ from '@/components/home/FAQ'
import JoinUs from '@/components/home/JoinUs'

export default function HomePage() {
  return (
    <div className="page-transition">
      <Hero />
      <HowItWorks />
      <Concept />
      <FoodCarousel />
      <FeaturedMenu />
      <TaxCreditBanner />
      <ServiceArea />
      <Testimonials />
      <FAQ />
      <JoinUs />
    </div>
  )
}
