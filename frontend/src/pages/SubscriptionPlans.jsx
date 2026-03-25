import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HiCheckCircle, HiSparkles, HiStar } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { candidatesAPI, paymentsAPI } from '../services/api'

const plans = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    tagline: 'Start your prep journey',
    icon: HiCheckCircle,
    features: [
      'Basic profile and resume tools',
      'Standard job applications',
      'Apply to jobs and complete real company interviews'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 499,
    tagline: 'Best for serious candidates',
    icon: HiSparkles,
    featured: true,
    features: [
      'Limited mock interview practice (3 per week)',
      'Advanced feedback and scoring',
      'Priority job recommendations',
      'Detailed performance analytics'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    priceMonthly: 999,
    tagline: 'Maximum acceleration',
    icon: HiStar,
    features: [
      'Everything in Pro',
      'Unlimited mock interview practice',
      'Deep behavioral insights',
      'Early access to premium jobs',
      'Top-ranked profile highlight'
    ]
  }
]

const SubscriptionPlans = () => {
  const location = useLocation()
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [mockCheckout, setMockCheckout] = useState({
    open: false,
    title: '',
    amountLabel: '',
    status: 'Initializing',
    progress: 0,
    canClose: false
  })
  const mockCheckoutPromiseRef = useRef({ resolve: null, reject: null })
  const paymentMode = String(import.meta.env.VITE_PAYMENT_MODE || 'auto').toLowerCase()
  const isClientMockMode = paymentMode === 'mock'
  const isClientLiveMode = paymentMode === 'live'

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)
    }
  }, [location.state])

  useEffect(() => {
    const loadCurrentSubscription = async () => {
      try {
        setLoading(true)
        const response = await candidatesAPI.getProfile()
        const profile = response?.data || response
        const subscription = profile?.subscription || {}
        setProfile(profile)
        setCurrentSubscription(subscription)

        setSelectedPlan(subscription.plan || 'free')
        setBillingCycle(subscription.billingCycle || 'monthly')
      } catch (err) {
        console.error('Failed to load subscription:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentSubscription()
  }, [])

  const getDisplayPrice = (plan) => {
    if (plan.priceMonthly === 0) return 'Free'
    if (billingCycle === 'yearly') {
      const yearlyPrice = Math.round(plan.priceMonthly * 12 * 0.8)
      return `INR ${yearlyPrice}/year`
    }
    return `INR ${plan.priceMonthly}/month`
  }

  const currentPlanId = currentSubscription?.plan || 'free'
  const currentPlanStatus = currentSubscription?.status || 'active'
  const currentBillingCycle = currentSubscription?.billingCycle || 'monthly'

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const reloadForHeaderSync = () => {
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const closeMockCheckout = () => {
    setMockCheckout((prev) => ({ ...prev, open: false }))
  }

  const cancelMockCheckout = () => {
    const reject = mockCheckoutPromiseRef.current.reject
    closeMockCheckout()
    if (reject) {
      reject(new Error('Mock payment cancelled by user'))
    }
    mockCheckoutPromiseRef.current = { resolve: null, reject: null }
  }

  const runMockCheckout = (orderData) => {
    const amountInr = Number(orderData?.amount || 0) / 100
    const amountLabel = Number.isFinite(amountInr) ? `INR ${amountInr}` : 'INR 0'

    return new Promise(async (resolve, reject) => {
      mockCheckoutPromiseRef.current = { resolve, reject }
      setMockCheckout({
        open: true,
        title: `${selectedPlan.toUpperCase()} Plan`,
        amountLabel,
        status: 'Securing checkout',
        progress: 8,
        canClose: true
      })

      try {
        await wait(450)
        setMockCheckout((prev) => ({ ...prev, status: 'Verifying merchant', progress: 32 }))

        await wait(550)
        setMockCheckout((prev) => ({ ...prev, status: 'Encrypting payment session', progress: 58 }))

        await wait(600)
        setMockCheckout((prev) => ({ ...prev, status: 'Authorizing transaction', progress: 84 }))

        await wait(650)
        setMockCheckout((prev) => ({ ...prev, status: 'Payment approved', progress: 100, canClose: false }))

        await wait(450)
        closeMockCheckout()

        if (mockCheckoutPromiseRef.current.resolve) {
          mockCheckoutPromiseRef.current.resolve({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `mock_payment_${Date.now()}`,
            razorpay_signature: 'mock_signature'
          })
        }
      } catch (e) {
        if (mockCheckoutPromiseRef.current.reject) {
          mockCheckoutPromiseRef.current.reject(e)
        }
      } finally {
        mockCheckoutPromiseRef.current = { resolve: null, reject: null }
      }
    })
  }

  const saveSubscription = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      if (selectedPlan === 'free') {
        const now = new Date()
        const renewDate = new Date(now)
        if (billingCycle === 'yearly') renewDate.setFullYear(now.getFullYear() + 1)
        else renewDate.setMonth(now.getMonth() + 1)

        await candidatesAPI.updateProfile({
          subscription: {
            plan: selectedPlan,
            billingCycle,
            status: 'active',
            startedAt: now.toISOString(),
            renewsAt: renewDate.toISOString()
          }
        })

        setCurrentSubscription({
          plan: selectedPlan,
          billingCycle,
          status: 'active',
          startedAt: now.toISOString(),
          renewsAt: renewDate.toISOString()
        })

        setMessage('Subscription updated successfully.')
        reloadForHeaderSync()
        return
      }

      const orderResponse = await paymentsAPI.createOrder({
        plan: selectedPlan,
        billingCycle
      })

      const orderData = orderResponse?.data || orderResponse
      const isServerMockOrder =
        orderData?.mode === 'mock' ||
        String(orderData?.orderId || '').startsWith('mock_order_') ||
        orderData?.keyId === 'rzp_test_mock'

      if (isClientLiveMode && isServerMockOrder) {
        throw new Error('Backend payment mode is mock. Set PAYMENT_MODE=live and valid Razorpay keys to use live checkout.')
      }

      if (isClientMockMode || (!isClientLiveMode && isServerMockOrder)) {
        const mockPayment = await runMockCheckout(orderData)
        await paymentsAPI.verifyPayment({
          plan: selectedPlan,
          billingCycle,
          razorpay_order_id: mockPayment.razorpay_order_id,
          razorpay_payment_id: mockPayment.razorpay_payment_id,
          razorpay_signature: mockPayment.razorpay_signature
        })
        setCurrentSubscription({
          plan: selectedPlan,
          billingCycle,
          status: 'active'
        })
        setMessage('Mock payment successful. Subscription activated.')
        reloadForHeaderSync()
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout script')
      }

      await new Promise((resolve, reject) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'HirePrep',
          description: `${selectedPlan.toUpperCase()} subscription (${billingCycle})`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              await paymentsAPI.verifyPayment({
                plan: selectedPlan,
                billingCycle,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
              setCurrentSubscription({
                plan: selectedPlan,
                billingCycle,
                status: 'active'
              })
              setMessage('Payment successful. Subscription activated.')
              reloadForHeaderSync()
              resolve()
            } catch (verifyErr) {
              reject(verifyErr)
            }
          },
          prefill: {
            name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
            email: profile?.email || ''
          },
          theme: {
            color: '#2563eb'
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user'))
          }
        }

        const razorpay = new window.Razorpay(options)
        razorpay.open()
      })
    } catch (err) {
      console.error('Failed to update subscription:', err)
      setError(err?.message || 'Could not process payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900">Choose Your Subscription</h1>
          <p className="text-slate-600 mt-2">Select the plan that matches your interview preparation needs.</p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-emerald-800">
              Active Plan: {currentPlanId.toUpperCase()} ({currentBillingCycle})
              {currentPlanStatus ? ` • ${currentPlanStatus}` : ''}
            </p>
          </div>

          <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Yearly (20% off)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isSelected = selectedPlan === plan.id
              const isCurrentPlan = currentPlanId === plan.id

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left rounded-2xl border p-6 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-[0_12px_24px_rgba(37,99,235,0.16)]'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  {plan.featured && (
                    <p className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mb-4">
                      Most Popular
                    </p>
                  )}

                  {isCurrentPlan && (
                    <p className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 mb-4 ml-2">
                      Active Plan
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>

                  <p className="text-sm text-slate-500 mb-3">{plan.tagline}</p>
                  <p className="text-xl font-bold text-slate-900 mb-4">{getDisplayPrice(plan)}</p>

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {message && <p className="text-green-700 font-semibold mb-3">{message}</p>}
          {error && <p className="text-red-700 font-semibold mb-3">{error}</p>}

          <button
            onClick={saveSubscription}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm Subscription'}
          </button>
        </div>

        {mockCheckout.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
              <div className="bg-linear-to-r from-sky-700 via-blue-700 to-indigo-700 px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-100/90">SECURED PAYMENTS</p>
                <h3 className="text-xl font-black mt-1">Checkout Demo</h3>
              </div>

              <div className="px-5 py-5 space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Plan</p>
                  <p className="text-lg font-bold">{mockCheckout.title}</p>
                  <p className="text-sm text-slate-300">{billingCycle === 'yearly' ? 'Yearly billing' : 'Monthly billing'}</p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Amount</p>
                  <p className="text-2xl font-black text-sky-300">{mockCheckout.amountLabel}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-200">{mockCheckout.status}</p>
                    <p className="text-sm font-bold text-sky-300">{mockCheckout.progress}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-500"
                      style={{ width: `${mockCheckout.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-center">256-bit SSL</span>
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-center">PCI DSS</span>
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-center">Demo Mode</span>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={cancelMockCheckout}
                    disabled={!mockCheckout.canClose}
                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default SubscriptionPlans
