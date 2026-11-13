import React, { useState } from 'react';
import {
  ShoppingCart,
  CreditCard,
  User,
  Package,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Server,
  ArrowRight,
  Flame,
  Check,
  Shield
} from 'lucide-react';

export default function DummyStorefront({
  telemetry,
  onSwitchToSre,
  onTriggerChaos
}) {
  const [cartCount, setCartCount] = useState(2);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const products = [
    {
      id: 1,
      sku: 'MOD-H100-80G',
      name: 'Tensor Pod H100 SXM5',
      category: 'Compute Core',
      price: 32999.00,
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80',
      tag: 'Tier 1'
    },
    {
      id: 2,
      sku: 'SEC-SENTINEL-X',
      name: 'PulseOps SRE Sentinel Key',
      category: 'Cryptographic Auth',
      price: 249.99,
      image: 'https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=600&q=80',
      tag: 'Hardware'
    },
    {
      id: 3,
      sku: 'NET-QUANTUM-100',
      name: 'Quantum Edge Gateway 100G',
      category: 'Ingress Proxy',
      price: 1499.00,
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      tag: 'Low Latency'
    }
  ];

  // 1. Interactive Checkout Flow (Scenario 1 Target)
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartCount, amount: 249.99 })
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail || {};
        setActionResult({
          status: 'ERROR',
          code: res.status,
          title: 'Payment Gateway Refused Transaction',
          error: detail.error || (typeof detail === 'string' ? detail : 'HTTP 500 Internal Server Error'),
          service: detail.service || 'payment-service',
          traceId: detail.trace_id,
          failingHop: detail.failing_hop
        });
      } else {
        setActionResult({
          status: 'SUCCESS',
          code: 200,
          title: 'Order Confirmed',
          orderId: data.order_id,
          message: data.message || 'Payment settled via Stripe gateway. Receipt generated.',
          latency: data.latency_ms
        });
      }
    } catch (err) {
      setActionResult({
        status: 'ERROR',
        code: 500,
        title: 'Connection Timed Out',
        error: err.message || 'Gateway socket unresponsive.',
        service: 'payment-service'
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  // 2. Interactive Customer Login Flow (Scenario 2 Target)
  const handleLogin = async () => {
    setLoginLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/store/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex.customer@apexstore.io' })
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail || {};
        setActionResult({
          status: 'ERROR',
          code: res.status,
          title: 'Authentication Service Unavailable',
          error: detail.error || (typeof detail === 'string' ? detail : 'HTTP 503 Service Unavailable'),
          service: detail.service || 'auth-service',
          failingHop: detail.failing_hop
        });
      } else {
        setActionResult({
          status: 'SUCCESS',
          code: 200,
          title: 'Authenticated Session Active',
          message: `${data.user || 'Alex Customer'} (${data.role || 'Member'}) verified in ${data.latency_ms || 22}ms.`
        });
      }
    } catch (err) {
      setActionResult({
        status: 'ERROR',
        code: 503,
        title: 'Auth Connection Refused',
        error: err.message,
        service: 'auth-service'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // 3. Interactive Package Fulfillment Tracking (Scenario 3 Target)
  const handleTracking = async () => {
    setTrackingLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/store/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'ORD-9981' })
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail || {};
        setActionResult({
          status: 'ERROR',
          code: res.status,
          title: 'Gateway Routing Timeout',
          error: detail.error || (typeof detail === 'string' ? detail : 'HTTP 504 Gateway Timeout'),
          service: detail.service || 'api-gateway',
          failingHop: detail.failing_hop
        });
      } else {
        setActionResult({
          status: 'SUCCESS',
          code: 200,
          title: 'Package Located in Transit',
          message: `${data.tracking_number}: ${data.status_text} (${data.carrier})`
        });
      }
    } catch (err) {
      setActionResult({
        status: 'ERROR',
        code: 504,
        title: 'TLS Handshake Aborted',
        error: err.message,
        service: 'api-gateway'
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  const isDegraded = telemetry?.status === 'CRITICAL';

  return (
    <div className="flex-1 flex flex-col bg-[#060b16] text-[#f3efe6]">
      {/* Store Navigation Bar */}
      <nav className="bg-[#0a1122]/90 border-b border-[#16233d] px-6 py-3.5 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-[#2b3c5e] bg-[#0f1a30] flex items-center justify-center text-[#d8c5a4]">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-widest text-[#f5efe6] uppercase">
              APEX<span className="text-[#cbb592]">HARDWARE</span>
            </div>
            <div className="text-[10px] text-[#8e9bb2]">PRODUCTION STOREFRONT v1.8</div>
          </div>
        </div>

        {/* Status Indicator & SRE Bridge Link */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs border ${
              isDegraded
                ? 'bg-rose-950/40 text-rose-300 border-rose-800 animate-pulse'
                : 'bg-[#0e182d] text-[#cbb592] border-[#223558]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDegraded ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-[#cbb592] shadow-[0_0_6px_#cbb592]'
              }`}
            />
            <span className="text-[11px] tracking-wider font-semibold">
              {isDegraded ? 'INGRESS DEGRADED (5XX DETECTED)' : 'SERVICES OPERATIONAL (200 OK)'}
            </span>
          </div>

          <button
            onClick={onSwitchToSre}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#101b31] hover:bg-[#152545] text-[#d8c5a4] border border-[#263a5f] text-xs font-medium transition-all"
          >
            <Server className="w-3.5 h-3.5 text-[#cbb592]" />
            <span>Open SRE Mission Control</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </button>
        </div>
      </nav>

      {/* Production Outage Alert (Natural customer-facing notification without fix buttons) */}
      {isDegraded && (
        <div className="bg-[#190d16] border-b border-rose-900/60 px-6 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold uppercase tracking-wider">System Advisory:</span>
            <span className="text-[#e2c7c7]">
              {telemetry?.active_scenario === 'scenario_1'
                ? 'Our payment processing gateway is temporarily unavailable. SRE on-call engineers have been paged.'
                : telemetry?.active_scenario === 'scenario_2'
                ? 'Authentication service is experiencing high load. Automated investigation is active.'
                : 'API gateway connectivity issue detected on order fulfillment route.'}
            </span>
          </div>
          <button
            onClick={onSwitchToSre}
            className="text-[#d8c5a4] hover:text-white px-2 py-0.5 rounded text-[11px] border border-[#3e2c2c] hover:border-[#cbb592] transition-colors flex items-center gap-1 shrink-0 ml-4"
          >
            <span>Investigate in SRE Dashboard</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Hero Customer Action Simulator */}
      <div className="px-6 py-7 border-b border-[#16233d] bg-[#09101f]/70">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#101b31] text-[#cbb592] border border-[#263a5f] text-[11px] uppercase tracking-wider mb-2.5 font-semibold">
              <Zap className="w-3 h-3 text-[#cbb592]" /> Live Customer Operations Bench
            </div>
            <h1 className="text-2xl font-semibold text-[#f5efe6] tracking-tight sm:text-3xl">
              Simulate Live User Transactions Against Backend Microservices
            </h1>
            <p className="mt-2 text-xs text-[#9eabbf] leading-relaxed">
              Execute customer checkouts, authentication, and tracking requests below. When a backend fault is triggered, the storefront experiences authentic HTTP 5xx failures. Switch to the SRE Dashboard to observe the autonomous ReAct investigation and approve the fix.
            </p>

            {/* Quick Fault Injections on website for demo flexibility */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] uppercase text-[#73839c] flex items-center gap-1 font-semibold">
                <Flame className="w-3.5 h-3.5 text-[#cbb592]" /> Inject Outage:
              </span>
              <button
                onClick={() => onTriggerChaos('scenario_1')}
                className="px-2.5 py-1 rounded bg-[#131e36] hover:bg-[#1a2a4b] border border-[#223558] hover:border-rose-500/60 text-[#dfd5c4] text-[11px] transition-all"
              >
                1. Break Checkout (500)
              </button>
              <button
                onClick={() => onTriggerChaos('scenario_2')}
                className="px-2.5 py-1 rounded bg-[#131e36] hover:bg-[#1a2a4b] border border-[#223558] hover:border-amber-500/60 text-[#dfd5c4] text-[11px] transition-all"
              >
                2. Crash Auth (503)
              </button>
              <button
                onClick={() => onTriggerChaos('scenario_3')}
                className="px-2.5 py-1 rounded bg-[#131e36] hover:bg-[#1a2a4b] border border-[#223558] hover:border-purple-500/60 text-[#dfd5c4] text-[11px] transition-all"
              >
                3. Expire SSL (504)
              </button>
            </div>
          </div>

          {/* Customer Interactive Action Panel */}
          <div className="bg-[#0b1325] p-4 rounded-lg border border-[#1b2a4a] w-full md:w-96 shadow-xl flex flex-col gap-2.5">
            <div className="text-[11px] font-bold text-[#cbb592] uppercase tracking-wider flex items-center justify-between border-b border-[#1b2a4a] pb-2">
              <span>Customer Transaction Actions</span>
              <span className="text-[10px] text-[#6b7b95]">FastAPI Edge</span>
            </div>

            {/* Action 1: Checkout */}
            <button
              disabled={checkoutLoading}
              onClick={handleCheckout}
              className="flex items-center justify-between p-2.5 rounded bg-[#121f3a] hover:bg-[#18294d] border border-[#253961] hover:border-[#cbb592] text-[#f5efe6] text-xs font-medium transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-[#cbb592]" />
                <span>{checkoutLoading ? 'Processing Charge...' : '1. Buy Now / Checkout ($249)'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#070c18] text-[#8e9bb2]">POST /checkout</span>
            </button>

            {/* Action 2: Login */}
            <button
              disabled={loginLoading}
              onClick={handleLogin}
              className="flex items-center justify-between p-2.5 rounded bg-[#121f3a] hover:bg-[#18294d] border border-[#253961] hover:border-[#cbb592] text-[#f5efe6] text-xs font-medium transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#d8c5a4]" />
                <span>{loginLoading ? 'Authenticating...' : '2. Sign In (Auth Service)'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#070c18] text-[#8e9bb2]">POST /login</span>
            </button>

            {/* Action 3: Tracking */}
            <button
              disabled={trackingLoading}
              onClick={handleTracking}
              className="flex items-center justify-between p-2.5 rounded bg-[#121f3a] hover:bg-[#18294d] border border-[#253961] hover:border-[#cbb592] text-[#f5efe6] text-xs font-medium transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[#d8c5a4]" />
                <span>{trackingLoading ? 'Querying Gateway...' : '3. Track Order (Gateway)'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#070c18] text-[#8e9bb2]">POST /track-order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Action Feedback Card */}
      {actionResult && (
        <div className="px-6 py-4 max-w-6xl mx-auto w-full animate-in fade-in">
          <div
            className={`p-4 rounded-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              actionResult.status === 'ERROR'
                ? 'bg-[#180e1b] border-rose-800/80 text-rose-200'
                : 'bg-[#0c1822] border-emerald-800/80 text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {actionResult.status === 'ERROR' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#cbb592] shrink-0" />
                )}
              </div>
              <div>
                <div className="font-bold text-xs tracking-wide flex items-center gap-2 text-[#f5efe6]">
                  <span>{actionResult.title}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      actionResult.status === 'ERROR'
                        ? 'bg-rose-950 border-rose-700 text-rose-300'
                        : 'bg-[#12221b] border-emerald-700 text-emerald-300'
                    }`}
                  >
                    HTTP {actionResult.code}
                  </span>
                </div>
                <div className="text-xs mt-1 opacity-90 leading-relaxed text-[#dfd5c4]">
                  {actionResult.error || actionResult.message}
                </div>
                {actionResult.failingHop && (
                  <div className="text-[11px] text-rose-300 font-semibold mt-1">
                    Failing Dependency Hop: {actionResult.failingHop}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap">
              {actionResult.status === 'ERROR' ? (
                <button
                  onClick={onSwitchToSre}
                  className="px-3.5 py-1.5 rounded bg-[#cbb592] hover:bg-[#dfd5c4] text-[#060b16] text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <span>Open SRE Triage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setActionResult(null)}
                  className="text-xs text-[#cbb592] hover:text-white px-3 py-1 rounded hover:bg-[#122038]"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog Showcase */}
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex-1">
        <div className="flex items-center justify-between mb-4 border-b border-[#16233d] pb-2">
          <h2 className="text-xs font-bold text-[#cbb592] uppercase tracking-wider flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#cbb592]" /> Hardware Infrastructure Catalog
          </h2>
          <span className="text-xs text-[#8e9bb2]">Cart: $1,299.00 ({cartCount} items)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-[#0b1325] border border-[#1b2a4a] rounded-lg overflow-hidden flex flex-col hover:border-[#2b3e66] transition-all"
            >
              <div className="h-36 w-full overflow-hidden bg-[#070c18] relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
                />
                <span className="absolute top-2 left-2 text-[9px] uppercase px-2 py-0.5 rounded bg-[#060b16]/90 text-[#cbb592] border border-[#1b2a4a]">
                  {product.tag}
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-[#73839c] uppercase font-mono">{product.category} • {product.sku}</div>
                  <h3 className="text-xs font-semibold text-[#f5efe6] mt-1 leading-snug">{product.name}</h3>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#16233d] flex items-center justify-between">
                  <span className="text-sm font-bold text-[#cbb592]">
                    ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={handleCheckout}
                    className="px-3 py-1 rounded bg-[#131f38] hover:bg-[#1a2c50] text-[#f5efe6] hover:text-[#cbb592] text-xs font-medium border border-[#223558] transition-all flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="border-t border-[#16233d] px-6 py-3 text-center text-[11px] text-[#6b7b95] bg-[#070c18]">
        Apex Hardware Infrastructure Platform • Monitored Autonomously by PulseOps
      </footer>
    </div>
  );
}
