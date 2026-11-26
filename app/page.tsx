import JsonLd from '@/components/seo/JsonLd'
import { homeGraph } from '@/lib/structured-data'
import Hero from '@/components/home/Hero'
import Concept from '@/components/home/Concept'
import FoodCarousel from '@/components/home/FoodCarousel'
import HowItWorksScroll from '@/components/home/HowItWorksScroll'
import FeaturedMenu from '@/components/home/FeaturedMenu'
import TaxCreditBanner from '@/components/home/TaxCreditBanner'
import ServiceArea from '@/components/home/ServiceArea'
import Testimonials from '@/components/home/Testimonials'
import FAQ from '@/components/home/FAQ'
import JoinUs from '@/components/home/JoinUs'

export default function HomePage() {
  return (
    <div className="page-transition">
      <JsonLd data={homeGraph()} />
      <Hero />
      <HowItWorksScroll />
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
