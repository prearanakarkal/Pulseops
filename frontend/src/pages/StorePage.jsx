import React, { useState } from 'react';
import {
  ShoppingCart,
  User,
  Package,
  Search,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  X,
  CreditCard,
  Flame,
  RefreshCw,
  Compass
} from 'lucide-react';

export default function StorePage({ onNavigateToDashboard }) {
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'SXM5 Tensor Processor 80GB', price: 14200.0, qty: 1, sku: 'H100-SXM5-80G' },
    { id: 2, name: 'Quantum Ingress Gateway 100G', price: 1850.0, qty: 2, sku: 'QNT-GW-100' }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Processing states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isTriggeringChaos, setIsTriggeringChaos] = useState(false);

  // Customer-facing feedback banner (STRICTLY NO TECHNICAL ERROR INFO)
  const [customerNotice, setCustomerNotice] = useState(null);
  const [cartNotice, setCartNotice] = useState(null);
  const [loginNotice, setLoginNotice] = useState(null);
  const [trackNotice, setTrackNotice] = useState(null);

  const categories = ['ALL', 'COMPUTE ACCELERATORS', 'OPTICAL SWITCHES', 'HARDWARE KEYS', 'COOLING ARRAYS'];

  const products = [
    {
      id: 1,
      sku: 'H100-SXM5-80G',
      name: 'SXM5 Tensor Processor 80GB',
      category: 'COMPUTE ACCELERATORS',
      price: 14200.0,
      description: 'Ultra-low latency dense matrix computing node for neural modeling.',
      badge: 'FLAGSHIP',
      inStock: true
    },
    {
      id: 2,
      sku: 'QNT-GW-100',
      name: 'Quantum Ingress Gateway 100G',
      category: 'OPTICAL SWITCHES',
      price: 1850.0,
      description: 'Zero-jitter microsecond optical packet switch with hardware flow steering.',
      badge: 'POPULAR',
      inStock: true
    },
    {
      id: 3,
      sku: 'FIDO-HSM-P8',
      name: 'Apex Cryptographic Hardware Module',
      category: 'HARDWARE KEYS',
      price: 480.0,
      description: 'FIPS 140-3 Level 4 tamper-reactive hardware identity key.',
      badge: 'SECURITY',
      inStock: true
    },
    {
      id: 4,
      sku: 'LIQ-SUB-4U',
      name: 'Phase-Change Immersion Cold Plate',
      category: 'COOLING ARRAYS',
      price: 940.0,
      description: 'Direct-to-silicon dielectric immersion module with dual-loop dissipation.',
      badge: 'THERMAL',
      inStock: true
    },
    {
      id: 5,
      sku: 'B200-NVL-72',
      name: 'Blackwell Supercluster Scaler',
      category: 'COMPUTE ACCELERATORS',
      price: 36500.0,
      description: 'Liquid-cooled unified tensor memory fabric running at 1.8 TB/s interconnect.',
      badge: 'PRE-ORDER',
      inStock: true
    },
    {
      id: 6,
      sku: 'OPT-CWDM-800',
      name: '800G Transceiver Array',
      category: 'OPTICAL SWITCHES',
      price: 2150.0,
      description: 'Octal small form-factor pluggable optical engine for hyperscale fabrics.',
      badge: 'ENTERPRISE',
      inStock: true
    }
  ];

  const totalCartAmount = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, sku: product.sku }];
    });
    setCustomerNotice({
      type: 'success',
      title: 'Item Added to Bag',
      message: `${product.name} has been added to your order.`
    });
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ==============================================================
  // STOREFRONT SIMULATION CHAOS TRIGGERS
  // Automatically triggers fault on backend and switches to Admin Dashboard!
  // ==============================================================
  const handleTriggerSimulation = async (scenarioNumber) => {
    setIsTriggeringChaos(true);
    const scenarioKey = `scenario_${scenarioNumber}`;
    try {
      const res = await fetch('/api/chaos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioKey })
      });
      const data = await res.json();
      if (res.ok) {
        // Do not redirect; display active outage advisory on the store page
        setCustomerNotice({
          type: 'error',
          title: `Simulated Outage Active: Scenario ${scenarioNumber}`,
          message: `Fault injected (${scenarioNumber === 1 ? 'HTTP 500 Connection Pool Exhausted' : scenarioNumber === 2 ? 'HTTP 503 Auth Memory Leak' : 'HTTP 504 SSL Expiry'}). Autonomous SRE agent is investigating on the SRE dashboard.`
        });
      } else {
        alert(data.detail || 'Could not inject chaos simulation.');
      }
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    } finally {
      setIsTriggeringChaos(false);
    }
  };

  const handleResetSystem = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      setCustomerNotice({
        type: 'success',
        title: 'System Restored',
        message: 'All microservices, database pools, and ingress proxies are nominal.'
      });
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // ==============================================================
  // 1. Customer Checkout Action (Scenario 1 target)
  // NOTE: Strictly customer-facing! No technical error details shown.
  // ==============================================================
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCartNotice(null);
    setCustomerNotice(null);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: totalCartCount, amount: totalCartAmount })
      });
      const data = await res.json();
      if (!res.ok) {
        // Friendly customer notice without technical details - placed directly inside cart drawer!
        setCartNotice({
          type: 'error',
          title: 'Payment Processing Notice',
          message: 'We are currently unable to complete your checkout. Please verify your payment details or try again in a few moments.'
        });
      } else {
        setCartItems([]);
        setIsCartOpen(false);
        setCustomerNotice({
          type: 'success',
          title: 'Order Confirmed',
          message: `Thank you for your purchase! Order #${data.order_id || 'APX-9821'} is being prepared for dispatch.`
        });
      }
    } catch {
      setCartNotice({
        type: 'error',
        title: 'Payment Processing Notice',
        message: 'We are momentarily experiencing high order volume. Please try again shortly.'
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ==============================================================
  // 2. Customer Sign-In Action (Scenario 2 target)
  // NOTE: Strictly customer-facing! No technical error details shown.
  // ==============================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginNotice(null);
    try {
      const res = await fetch('/api/store/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'client@apex.io', role: 'enterprise' })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginNotice({
          type: 'error',
          title: 'Sign In Notice',
          message: 'Unable to authenticate your session right now. Please verify your password and retry in a moment.'
        });
      } else {
        setIsLoginModalOpen(false);
        setCustomerNotice({
          type: 'success',
          title: 'Welcome Back',
          message: 'You are signed into your Apex Enterprise account.'
        });
      }
    } catch {
      setLoginNotice({
        type: 'error',
        title: 'Sign In Notice',
        message: 'Account authentication is briefly unavailable. Please try again in a moment.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==============================================================
  // 3. Customer Order Tracking Action (Scenario 3 target)
  // NOTE: Strictly customer-facing! No technical error details shown.
  // ==============================================================
  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setIsTracking(true);
    setTrackNotice(null);
    try {
      const res = await fetch('/api/store/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_id: orderQuery || 'APX-TRK-770' })
      });
      const data = await res.json();
      if (!res.ok) {
        setTrackNotice({
          type: 'error',
          title: 'Order Status Notice',
          message: 'Real-time tracking updates are currently undergoing routine maintenance. Please check back shortly.'
        });
      } else {
        setIsTrackModalOpen(false);
        setCustomerNotice({
          type: 'success',
          title: 'Package in Transit',
          message: `Your package #${orderQuery || 'APX-TRK-770'} has cleared the regional hub and is scheduled for delivery.`
        });
      }
    } catch {
      setTrackNotice({
        type: 'error',
        title: 'Order Status Notice',
        message: 'Order tracking service is temporarily updating. Please refresh in a moment.'
      });
    } finally {
      setIsTracking(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#EDE7DC] text-[#0A1326] flex flex-col selection:bg-[#0A1326] selection:text-[#EDE7DC]">
      {/* ============================================================== */}
      {/* STOREFRONT SIMULATION CONTROLS BAR (CHAOS TRIGGERS)           */}
      {/* ============================================================== */}
      <section className="bg-[#E4DCCE] border-b border-[#D4CBBE] px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wider uppercase text-[11px] text-[#0A1326] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#B91C1C]" />
              SIMULATION OUTAGE TRIGGERS:
            </span>
            <span className="text-[11px] font-medium text-[#5E687A] hidden md:inline">
              (Click to trigger outage &amp; switch immediately to SRE Admin Dashboard)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={isTriggeringChaos}
              onClick={() => handleTriggerSimulation(1)}
              className="px-3 py-1.5 rounded-xl neu-btn text-[11px] font-extrabold text-[#0A1326] hover:text-[#B91C1C] flex items-center gap-1.5 transition-all shadow-sm"
              title="Inject HTTP 500 DB Pool Exhaustion and view simulation on Admin Dashboard"
            >
              <Flame className="w-3 h-3 text-[#B91C1C]" />
              <span>Crash 1: 500 DB Pool</span>
            </button>

            <button
              disabled={isTriggeringChaos}
              onClick={() => handleTriggerSimulation(2)}
              className="px-3 py-1.5 rounded-xl neu-btn text-[11px] font-extrabold text-[#0A1326] hover:text-[#B91C1C] flex items-center gap-1.5 transition-all shadow-sm"
              title="Inject HTTP 503 Memory Leak and view simulation on Admin Dashboard"
            >
              <Flame className="w-3 h-3 text-[#B91C1C]" />
              <span>Crash 2: 503 Auth Memory</span>
            </button>

            <button
              disabled={isTriggeringChaos}
              onClick={() => handleTriggerSimulation(3)}
              className="px-3 py-1.5 rounded-xl neu-btn text-[11px] font-extrabold text-[#0A1326] hover:text-[#B91C1C] flex items-center gap-1.5 transition-all shadow-sm"
              title="Inject HTTP 504 SSL Expiry and view simulation on Admin Dashboard"
            >
              <Flame className="w-3 h-3 text-[#B91C1C]" />
              <span>Crash 3: 504 SSL Expiry</span>
            </button>

            <button
              onClick={handleResetSystem}
              className="p-1.5 rounded-xl neu-btn text-[#0A1326] hover:text-[#047857]"
              title="Reset System to Healthy Nominal State"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Top Brand & Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#EDE7DC]/90 backdrop-blur-md border-b border-[#D4CBBE]/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Brand Logo with Modernist Typography */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center font-extrabold text-xl text-[#0A1326]">
              A
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tighter text-[#0A1326] block leading-none">
                APEX HARDWARE
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-[#5E687A] uppercase">
                Precision Computing Architecture
              </span>
            </div>
          </div>

          {/* Center Search Input with Neumorphic Well */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="w-full relative">
              <Search className="w-4 h-4 text-[#5E687A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search silicon, interconnects, cold plates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl neu-inset text-sm text-[#0A1326] placeholder-[#7E889A] outline-none font-medium transition-all"
              />
            </div>
          </div>

          {/* Right Action Icons & Page Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTrackNotice(null);
                setIsTrackModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl neu-btn text-xs font-bold tracking-tight text-[#0A1326] flex items-center gap-2"
              title="Track Existing Order"
            >
              <Package className="w-4 h-4 text-[#0A1326]" />
              <span className="hidden sm:inline">Track Order</span>
            </button>

            <button
              onClick={() => {
                setLoginNotice(null);
                setIsLoginModalOpen(true);
              }}
              className="p-2.5 rounded-xl neu-btn text-[#0A1326]"
              title="Customer Sign In"
            >
              <User className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCartNotice(null);
                setIsCartOpen(true);
              }}
              className="px-4 py-2 rounded-xl neu-btn-navy flex items-center gap-2.5 text-xs font-bold tracking-tight"
            >
              <ShoppingCart className="w-4 h-4 text-[#EDE7DC]" />
              <span>Bag ({totalCartCount})</span>
            </button>

            <div className="h-6 w-px bg-[#D4CBBE] mx-1 hidden sm:block" />

            {/* Direct Switch to SRE Admin Dashboard */}
            <button
              onClick={onNavigateToDashboard}
              className="px-3.5 py-2 rounded-xl neu-btn-navy flex items-center gap-2 text-xs font-extrabold tracking-tight bg-[#0A1326] text-[#EDE7DC] hover:opacity-90 transition-all shadow-sm"
              title="Open Autonomous SRE Mission Control Admin Dashboard"
            >
              <Compass className="w-4 h-4 text-[#EDE7DC]" />
              <span className="hidden sm:inline">SRE Page</span>
            </button>
          </div>
        </div>
      </header>

      {/* Customer Notice Alert (Strictly Polite & Non-Technical) */}
      {customerNotice && (
        <div className="max-w-7xl mx-auto px-6 pt-6 w-full">
          <div
            className={`p-5 rounded-2xl neu-flat flex items-start justify-between gap-4 border-l-4 ${
              customerNotice.type === 'error'
                ? 'border-[#B91C1C]'
                : 'border-[#047857]'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  customerNotice.type === 'error'
                    ? 'bg-[#B91C1C]/15 text-[#B91C1C]'
                    : 'bg-[#047857]/15 text-[#047857]'
                }`}
              >
                {customerNotice.type === 'error' ? '!' : '✓'}
              </div>
              <div>
                <h4 className="font-extrabold text-base tracking-tight text-[#0A1326]">
                  {customerNotice.title}
                </h4>
                <p className="text-sm font-medium text-[#465266] mt-0.5 max-w-2xl">
                  {customerNotice.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCustomerNotice(null)}
              className="p-1.5 rounded-lg hover:bg-[#D4CBBE]/50 text-[#5E687A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Storefront Hero */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full flex flex-col gap-12">
        <section className="neu-flat-lg rounded-3xl p-8 md:p-14 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col gap-5 max-w-2xl z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full neu-flat-sm text-[11px] font-extrabold tracking-widest text-[#0A1326] uppercase w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#0A1326]" />
              GENERATION VII SILICON
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-[#0A1326] leading-none">
              ENGINEERED FOR EXTREMES.
            </h1>
            <p className="text-lg md:text-xl font-medium text-[#4A5568] max-w-xl leading-relaxed">
              Hyperscale computational hardware, phase-change immersion cooling, and optical switches designed for uncompromising uptime.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => addToCart(products[0])}
                className="px-7 py-3.5 rounded-2xl neu-btn-navy font-extrabold text-sm tracking-tight flex items-center gap-3"
              >
                <span>Acquire SXM5 Module</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setTrackNotice(null);
                  setIsTrackModalOpen(true);
                }}
                className="px-6 py-3.5 rounded-2xl neu-btn font-extrabold text-sm tracking-tight text-[#0A1326]"
              >
                Track Shipment
              </button>
            </div>
          </div>

          <div className="w-full md:w-80 h-72 rounded-3xl neu-inset flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full neu-flat flex items-center justify-center mb-4">
              <ShieldCheck className="w-12 h-12 text-[#0A1326]" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#0A1326]">
              Enterprise SLA Guarantee
            </span>
            <span className="text-xs font-semibold text-[#5E687A] mt-1">
              Zero-latency global replacement with 24/7 dedicated engineering support.
            </span>
          </div>
        </section>

        {/* Category Pills Filter */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0A1326]">
              Catalogue Index
            </h2>
            <span className="text-xs font-bold text-[#5E687A] tracking-wider uppercase">
              Showing {filteredProducts.length} Assemblies
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold tracking-tight transition-all shrink-0 ${
                  activeCategory === cat ? 'neu-btn-navy' : 'neu-btn text-[#0A1326]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Product Cards Grid with Neumorphism */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="neu-flat rounded-3xl p-6 flex flex-col justify-between gap-6 transition-all hover:translate-y-[-2px]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl neu-inset-sm text-[10px] font-extrabold tracking-wider text-[#0A1326]">
                    {product.badge}
                  </span>
                  <span className="text-[11px] font-bold text-[#5E687A]">
                    {product.sku}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl tracking-tight text-[#0A1326]">
                  {product.name}
                </h3>
                <p className="text-xs font-medium text-[#4A5568] leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#D4CBBE]/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#5E687A] block leading-none">
                    Unit Price (USD)
                  </span>
                  <span className="text-2xl font-extrabold tracking-tight text-[#0A1326]">
                    ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="px-4 py-2.5 rounded-xl neu-btn-navy text-xs font-extrabold tracking-tight flex items-center gap-2"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-[#EDE7DC]" />
                  <span>Add to Bag</span>
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Value Propositions / Modernist Feature Triad */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 pb-8">
          <div className="neu-flat rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl neu-inset shrink-0">
              <Truck className="w-6 h-6 text-[#0A1326]" />
            </div>
            <div>
              <h4 className="font-extrabold text-base tracking-tight text-[#0A1326]">
                Global Armored Freight
              </h4>
              <p className="text-xs font-medium text-[#5E687A] mt-1 leading-relaxed">
                Direct dock-to-datacenter delivery with temperature and shock telematics logging.
              </p>
            </div>
          </div>

          <div className="neu-flat rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl neu-inset shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#0A1326]" />
            </div>
            <div>
              <h4 className="font-extrabold text-base tracking-tight text-[#0A1326]">
                5-Year Silicon Warranty
              </h4>
              <p className="text-xs font-medium text-[#5E687A] mt-1 leading-relaxed">
                Every matrix node is factory bin-tested to withstand sustained thermal cycling.
              </p>
            </div>
          </div>

          <div className="neu-flat rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl neu-inset shrink-0">
              <RotateCcw className="w-6 h-6 text-[#0A1326]" />
            </div>
            <div>
              <h4 className="font-extrabold text-base tracking-tight text-[#0A1326]">
                30-Day Cluster Pilot
              </h4>
              <p className="text-xs font-medium text-[#5E687A] mt-1 leading-relaxed">
                Benchmark compute nodes directly inside your production rack before settlement.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* CART DRAWER MODAL WITH IN-MODAL POLITE ERROR FEEDBACK         */}
      {/* ============================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0A1326]/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-[#EDE7DC] p-8 flex flex-col justify-between neu-flat-lg border-l border-[#D4CBBE]">
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#D4CBBE]">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-[#0A1326]" />
                  <h3 className="font-extrabold text-2xl tracking-tight text-[#0A1326]">
                    Your Order Bag
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-xl neu-btn text-[#0A1326]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* In-Drawer Customer Alert Notice */}
              {cartNotice && (
                <div className="p-4 rounded-2xl neu-flat border-l-4 border-[#B91C1C] flex flex-col gap-1.5 bg-[#B91C1C]/5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#B91C1C]">
                      {cartNotice.title}
                    </span>
                    <button
                      onClick={() => setCartNotice(null)}
                      className="text-[#5E687A] hover:text-[#0A1326]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-[#465266] leading-relaxed">
                    {cartNotice.message}
                  </p>
                </div>
              )}

              {cartItems.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full neu-inset flex items-center justify-center text-[#5E687A]">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <span className="font-extrabold text-lg text-[#0A1326]">Your bag is empty</span>
                  <span className="text-xs text-[#5E687A]">Select silicon modules to begin your build.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="neu-flat rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-extrabold text-sm text-[#0A1326]">{item.name}</h4>
                        <span className="text-[11px] font-semibold text-[#5E687A] block">
                          Qty: {item.qty} × ${item.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-[#0A1326]">
                          ${(item.price * item.qty).toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-[#5E687A] hover:text-[#B91C1C]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#D4CBBE] flex flex-col gap-4">
              <div className="flex items-center justify-between text-base">
                <span className="font-bold text-[#5E687A]">Subtotal</span>
                <span className="font-extrabold text-2xl tracking-tight text-[#0A1326]">
                  ${totalCartAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                disabled={cartItems.length === 0 || isCheckingOut}
                onClick={handleCheckout}
                className="w-full py-4 rounded-2xl neu-btn-navy font-extrabold text-sm tracking-tight flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <span>Contacting Payment Settlement...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-[#EDE7DC]" />
                    <span>Authorize & Settle Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SIGN IN MODAL WITH IN-MODAL POLITE FEEDBACK                   */}
      {/* ============================================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1326]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#EDE7DC] rounded-3xl p-8 neu-flat-lg flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-2xl tracking-tight text-[#0A1326]">
                Apex Customer Sign In
              </h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-2 rounded-xl neu-btn text-[#0A1326]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Alert Notice */}
            {loginNotice && (
              <div className="p-4 rounded-2xl neu-flat border-l-4 border-[#B91C1C] flex flex-col gap-1 bg-[#B91C1C]/5">
                <span className="font-extrabold text-xs text-[#B91C1C]">{loginNotice.title}</span>
                <p className="text-xs font-medium text-[#465266]">{loginNotice.message}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-extrabold tracking-wide uppercase text-[#5E687A] block mb-1.5">
                  Corporate Email
                </label>
                <input
                  type="email"
                  defaultValue="engineering@datarack.io"
                  className="w-full px-4 py-3 rounded-2xl neu-inset text-sm font-medium text-[#0A1326] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-wide uppercase text-[#5E687A] block mb-1.5">
                  Hardware Key / Passkey
                </label>
                <input
                  type="password"
                  defaultValue="••••••••••••"
                  className="w-full px-4 py-3 rounded-2xl neu-inset text-sm font-medium text-[#0A1326] outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-2xl neu-btn-navy font-extrabold text-sm tracking-tight mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating Identity...' : 'Sign Into Hardware Console'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TRACK ORDER MODAL WITH IN-MODAL POLITE FEEDBACK               */}
      {/* ============================================================== */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1326]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#EDE7DC] rounded-3xl p-8 neu-flat-lg flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-2xl tracking-tight text-[#0A1326]">
                Track Consignment
              </h3>
              <button
                onClick={() => setIsTrackModalOpen(false)}
                className="p-2 rounded-xl neu-btn text-[#0A1326]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Alert Notice */}
            {trackNotice && (
              <div className="p-4 rounded-2xl neu-flat border-l-4 border-[#B91C1C] flex flex-col gap-1 bg-[#B91C1C]/5">
                <span className="font-extrabold text-xs text-[#B91C1C]">{trackNotice.title}</span>
                <p className="text-xs font-medium text-[#465266]">{trackNotice.message}</p>
              </div>
            )}

            <form onSubmit={handleTrackOrder} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-extrabold tracking-wide uppercase text-[#5E687A] block mb-1.5">
                  Consignment ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. APX-TRK-770"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl neu-inset text-sm font-medium text-[#0A1326] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isTracking}
                className="w-full py-3.5 rounded-2xl neu-btn-navy font-extrabold text-sm tracking-tight flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTracking ? 'Querying Logistics Grid...' : 'Locate Consignment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modernist Footer */}
      <footer className="mt-auto border-t border-[#D4CBBE] py-10 px-6 bg-[#EDE7DC]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#0A1326] block">
              APEX HARDWARE ARCHITECTURES
            </span>
            <span className="text-xs font-medium text-[#5E687A]">
              ISO 9001:2026 Certified Precision Compute Assemblies.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateToDashboard}
              className="text-xs font-extrabold tracking-tight text-[#0A1326] underline decoration-[#0A1326]/30 hover:decoration-[#0A1326]"
            >
              Autonomous SRE Operations Desk →
            </button>
            <span className="text-xs text-[#5E687A]">© 2026 Apex Hardware Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
