'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Mail } from 'lucide-react'
import { FAQ_ITEMS } from '@/lib/mock-data'
import type { FAQItem } from '@/types'

const CATEGORIES = [
  { id: 'all',         label: 'Toutes' },
  { id: 'service',     label: 'Service' },
  { id: 'tarifs',      label: 'Tarifs' },
  { id: 'réservation', label: 'Réservation' },
  { id: 'recettes',    label: 'Recettes' },
  { id: 'fiscal',      label: 'Avantage fiscal' },
] as const

export default function FAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter((f) => f.category === activeCategory)

  const toggle = (id: string) => setOpenId(openId === id ? null : id)

  return (
    <section id="faq" className="section-padding section-paper" ref={ref}>
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <p className="eyebrow mb-5">FAQ</p>
            <h2 className="h-section mb-6">
              Questions <span className="accent">fréquentes</span>
            </h2>
            <p className="text-ink-mid leading-relaxed mb-8">
              Vous avez d&apos;autres questions ? Notre équipe est disponible
              du lundi au vendredi de 9h à 17h.
            </p>
            <a href="mailto:contact@labsfood.fr" className="btn btn-outline">
              <Mail className="w-4 h-4" />
              Nous contacter
            </a>

            {/* Categories */}
            <div className="mt-10">
              <p className="label-muted mb-4">Filtrer par</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`text-xs px-4 py-2 rounded-full border transition-all duration-200 font-medium ${
                      activeCategory === cat.id
                        ? 'border-terra bg-terra text-white'
                        : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-terra'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* FAQ list */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((item: FAQItem, i) => {
                  const isOpen = openId === item.id
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className={`rounded-2xl border transition-colors duration-300 overflow-hidden ${
                        isOpen
                          ? 'border-terra bg-cream'
                          : 'border-[rgba(31,26,20,0.08)] bg-paper hover:border-[rgba(217,105,65,0.4)]'
                      }`}
                    >
                      <button
                        onClick={() => toggle(item.id)}
                        className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left"
                      >
                        <span className={`text-base font-semibold transition-colors duration-200 ${
                          isOpen ? 'text-terra' : 'text-navy'
                        }`}>
                          {item.question}
                        </span>
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isOpen
                            ? 'bg-terra text-white'
                            : 'bg-cream-soft text-ink-mid'
                        }`}>
                          {isOpen
                            ? <Minus className="w-4 h-4" />
                            : <Plus className="w-4 h-4" />
                          }
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="text-ink-mid leading-relaxed px-6 pb-6 pr-16">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
