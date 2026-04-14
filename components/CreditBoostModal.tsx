'use client'

import { useState } from 'react'

interface Pack {
  id: string
  name: string
  tagline: string
  credits: number
  price: number
  originalPrice: number
  badge?: string
}

const PACKS: Pack[] = [
  {
    id: 'scout',
    name: 'Scout Pack',
    tagline: 'A little extra to keep you going',
    credits: 20,
    price: 4,
    originalPrice: 8,
  },
  {
    id: 'crew',
    name: 'Crew Pack',
    tagline: 'For creators who need more firepower',
    credits: 60,
    price: 10,
    originalPrice: 20,
    badge: 'Best Value',
  },
  {
    id: 'studio',
    name: 'Studio Pack',
    tagline: 'Maximum credits at the best rate',
    credits: 150,
    price: 22,
    originalPrice: 44,
  },
]

interface Props {
  planName: string
  billingLabel: string
  planPrice: number
  onCheckout: (packId: string | null) => void
  onBack: () => void
  loading: boolean
}

export default function CreditBoostModal({
  planName,
  billingLabel,
  planPrice,
  onCheckout,
  onBack,
  loading,
}: Props) {
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  const pack = PACKS.find((p) => p.id === selectedPack)
  const total = planPrice + (pack?.price ?? 0)
  const savedAmount = selectedPack
    ? PACKS.find((p) => p.id === selectedPack)!.originalPrice -
      PACKS.find((p) => p.id === selectedPack)!.price
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-purple-100">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-800 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
            One-time add-on
          </p>
          <h2 className="text-xl font-extrabold text-purple-950">Claim your exclusive deals</h2>
          <p className="text-sm text-purple-500 mt-1">
            Add bonus credits to your {planName} plan — one-time purchase, no recurring charge.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Pack options */}
          <div className="flex-1 p-6 space-y-3">
            {PACKS.map((p) => {
              const isSelected = selectedPack === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(isSelected ? null : p.id)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-purple-100 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Radio + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-purple-600 bg-purple-600' : 'border-purple-200'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-purple-950">{p.name}</span>
                          {p.badge && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-full">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-500 mt-0.5">{p.tagline}</p>
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ✓ {p.credits} bonus credits
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-purple-400 line-through">${p.originalPrice}</p>
                      <p className="text-base font-extrabold text-purple-600">${p.price}</p>
                    </div>
                  </div>
                </button>
              )
            })}

            <p className="text-xs text-purple-400 text-center pt-1">
              Select a pack above, or skip and go straight to checkout.
            </p>
          </div>

          {/* Order summary */}
          <div className="sm:w-64 bg-purple-50/60 border-t sm:border-t-0 sm:border-l border-purple-100 p-6 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">
              Order Summary
            </h3>

            <div className="space-y-2 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-purple-950">{planName}</p>
                  <p className="text-xs text-purple-400">{billingLabel}</p>
                </div>
                <p className="text-sm font-semibold text-purple-950">${planPrice}</p>
              </div>

              {pack && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-sm text-purple-700">{pack.name}</p>
                  <p className="text-sm text-purple-700">${pack.price}</p>
                </div>
              )}

              <div className="h-px bg-purple-200 my-3" />

              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-purple-950">Total Due</p>
                <p className="text-lg font-extrabold text-purple-950">${total}</p>
              </div>

              {savedAmount && (
                <p className="text-xs text-green-600 font-medium">
                  You save ${savedAmount} on this pack!
                </p>
              )}

              {!selectedPack && (
                <p className="text-xs text-red-400">
                  No pack selected — you&apos;re missing out on bonus credits!
                </p>
              )}
            </div>

            <button
              onClick={() => onCheckout(selectedPack)}
              disabled={loading}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Redirecting…
                </>
              ) : (
                'Checkout now →'
              )}
            </button>

            <p className="text-[10px] text-purple-400 text-center mt-3 leading-relaxed">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline hover:text-purple-600">Terms of Service</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
