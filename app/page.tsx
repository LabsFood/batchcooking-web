import Hero from '@/components/home/Hero'
import Concept from '@/components/home/Concept'
import FoodCarousel from '@/components/home/FoodCarousel'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedMenu from '@/components/home/FeaturedMenu'
import TaxCreditBanner from '@/components/home/TaxCreditBanner'
import Pricing from '@/components/home/Pricing'
import FeaturedChefs from '@/components/home/FeaturedChefs'
import ServiceArea from '@/components/home/ServiceArea'
import Testimonials from '@/components/home/Testimonials'
import FAQ from '@/components/home/FAQ'

export default function HomePage() {
  return (
    <div className="page-transition">
      <Hero />
      <Concept />
      <FoodCarousel />
      <HowItWorks />
      <FeaturedMenu />
      <TaxCreditBanner />
      <Pricing />
      <FeaturedChefs />
      <ServiceArea />
      <Testimonials />
      <FAQ />
    </div>
  )
}
