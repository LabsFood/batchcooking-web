'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Mail, ArrowUpRight } from 'lucide-react'
import { FAQ_ITEMS, FAQ_CATEGORIES, type FAQItem } from '@/lib/faq'
import { DURATION, EASE_IN, EASE_OUT, fadeUpInView } from '@/lib/motion'

// « Toutes » est l'absence de filtre ; les autres catégories viennent de la bibliothèque FAQ.
const FILTERS = [{ id: 'all', label: 'Toutes' }, ...FAQ_CATEGORIES]

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter((f) => f.category === activeCategory)

  const toggle = (id: string) => setOpenId(openId === id ? null : id)

  return (
    <section id="faq" className="section-padding section-paper">
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left column */}
          <motion.div
            // slow-out : se pose en 240 ms
            {...fadeUpInView()}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <h2 className="h-section mb-6">
              Questions fréquentes
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
                {FILTERS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`text-xs px-4 py-2 rounded-full border transition-colors duration-150 active:scale-[0.97] font-medium ${
                      activeCategory === cat.id
                        ? 'border-terra bg-terra text-white'
                        : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-amber-ink'
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
              // slow-out : se pose en 240 ms
              {...fadeUpInView(0.08)}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((item: FAQItem) => {
                  const isOpen = openId === item.id
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      // slow-out : la question arrive en 180 ms, repart en 120 ms
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
                      exit={{ opacity: 0, transition: { duration: DURATION.instant, ease: EASE_IN } }}
                      className={`rounded-2xl border transition-colors duration-200 overflow-hidden ${
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
                          isOpen ? 'text-amber-ink' : 'text-navy'
                        }`}>
                          {item.question}
                        </span>
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 ${
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
                            // slow-out : la réponse se déplie en 240 ms
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: DURATION.base, ease: EASE_OUT }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pr-16">
                              <p className="text-ink-mid leading-relaxed">{item.answer}</p>
                              {item.sources && (
                                <div className="mt-4">
                                  <p className="label-muted mb-2">Sources officielles</p>
                                  <ul className="space-y-1.5">
                                    {item.sources.map((source) => (
                                      <li key={source.label}>
                                        <a
                                          href={source.href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-start gap-1.5 text-sm text-amber-ink underline underline-offset-2 transition-colors hover:text-navy"
                                        >
                                          <span>{source.label}</span>
                                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                          <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
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
