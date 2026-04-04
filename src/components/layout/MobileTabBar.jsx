import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import { m } from "../../mobile/design";
import { BottomSheet } from "../../mobile/primitives";

const tabs = [
  { id: "/", label: "Home", icon: Home, matches: (pathname) => pathname === "/" },
  { id: "/market", label: "Market", icon: Search, matches: (pathname) => pathname.startsWith("/market") },
  { id: "/post", label: "Post", icon: Plus, matches: (pathname) => pathname.startsWith("/sell") || pathname.startsWith("/wtb") },
  { id: "/inbox", label: "Inbox", icon: MessageCircle, matches: (pathname) => pathname.startsWith("/inbox") || pathname.startsWith("/messages") },
  { id: "/account", label: "Account", icon: User, matches: (pathname) => pathname.startsWith("/account") },
];

export default function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, unreadMessageCount } = useMarketplace();
  const [showPostSheet, setShowPostSheet] = useState(false);
  const unread = Number(unreadMessageCount || 0);

  function goTo(target) {
    if (target === "/post") {
      setShowPostSheet(true);
      return;
    }
    if (target === "/account" && !currentUser) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }
    navigate(target);
  }

  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[min(calc(100vw-1rem),406px)] md:hidden">
        <div
          className="pointer-events-auto relative overflow-hidden rounded-[24px] px-1.5 py-[6px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(64,14,18,0.34) 0%, rgba(16,16,20,0.74) 26%, rgba(12,12,14,0.88) 100%)",
            backdropFilter: "blur(34px) saturate(185%)",
            WebkitBackdropFilter: "blur(34px) saturate(185%)",
            border: `1px solid ${m.borderStrong}`,
            boxShadow: "0 18px 44px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-10"
            style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.12), transparent)" }}
          />
          <div className="relative flex items-stretch justify-around">
            {tabs.map((tab) => {
              const active = tab.matches(location.pathname);
              const Icon = tab.icon;

              if (tab.id === "/post") {
                return (
                  <motion.button
                    key={tab.id}
                    aria-label={tab.label}
                    className="relative flex w-[62px] flex-col items-center justify-center"
                    type="button"
                    whileTap={{ scale: 0.84 }}
                    onClick={() => goTo(tab.id)}
                  >
                    {active ? (
                      <motion.div
                        layoutId="mobile-tab-post-glow"
                        className="absolute inset-x-2 bottom-0 top-0 rounded-[18px]"
                        style={{ background: "rgba(239,68,68,0.08)" }}
                        transition={{ type: "spring", damping: 26, stiffness: 360 }}
                      />
                    ) : null}
                    <div
                      className="relative z-10 flex h-[34px] w-[40px] items-center justify-center rounded-[12px]"
                      style={{
                        background: m.redGradient,
                        boxShadow: active ? "0 6px 18px rgba(239,68,68,0.34)" : "0 4px 14px rgba(239,68,68,0.26)",
                      }}
                    >
                      <Icon size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="relative z-10 mt-[3px] text-[10px]" style={{ color: active ? "#fff1f1" : m.redLight, fontWeight: 600 }}>
                      {tab.label}
                    </span>
                    {active ? (
                      <motion.div
                        layoutId="mobile-tab-indicator"
                        className="absolute -top-[1px] left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full"
                        style={{ background: m.redGradient }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                      />
                    ) : null}
                  </motion.button>
                );
              }

              return (
                <motion.button
                  key={tab.id}
                  className="relative flex w-[56px] flex-col items-center justify-center"
                  type="button"
                  whileTap={{ scale: 0.84 }}
                  onClick={() => goTo(tab.id)}
                >
                  {active ? (
                    <motion.div
                      layoutId="mobile-tab-active"
                      className="absolute inset-x-1 bottom-0 top-0 rounded-[18px]"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      transition={{ type: "spring", damping: 26, stiffness: 360 }}
                    />
                  ) : null}
                  <div className="relative z-10">
                    <Icon size={19} style={{ color: active ? m.redLight : m.textTertiary }} strokeWidth={active ? 2 : 1.6} />
                    {tab.id === "/inbox" && unread ? (
                      <div
                        className="absolute -right-[3px] -top-[1px] h-[5px] w-[5px] rounded-full"
                        style={{ background: m.redLight, boxShadow: "0 0 4px rgba(239,68,68,0.6)" }}
                      />
                    ) : null}
                  </div>
                  <span className="relative z-10 mt-[3px] text-[10px]" style={{ color: active ? m.redLight : m.textTertiary, fontWeight: active ? 600 : 400 }}>
                    {tab.label}
                  </span>
                  {active ? (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute -top-[1px] left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full"
                      style={{ background: m.redGradient }}
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      <BottomSheet open={showPostSheet} onClose={() => setShowPostSheet(false)}>
        <div className="px-5 pb-8 pt-4">
          <div className="mb-4">
            <h2 className="text-[18px] text-white" style={{ fontWeight: 700 }}>
              Post to the market
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: m.textSecondary }}>
              Sell a card or create a want-to-buy request for local sellers.
            </p>
          </div>
          <div className="grid gap-2.5">
            <motion.button
              className="rounded-[18px] border px-4 py-3 text-left"
              style={{ background: m.surface, borderColor: m.borderStrong }}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowPostSheet(false);
                navigate(currentUser ? "/sell" : "/auth", { state: { from: location.pathname } });
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                    Sell a card
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>
                    Add pricing, photos, and meetup details to a new listing.
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[14px]"
                  style={{ background: m.redGradient, boxShadow: "0 8px 18px rgba(239,68,68,0.22)" }}
                >
                  <Plus size={18} className="text-white" strokeWidth={2.4} />
                </div>
              </div>
            </motion.button>

            <motion.button
              className="rounded-[18px] border px-4 py-3 text-left"
              style={{ background: m.surface, borderColor: m.borderStrong }}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowPostSheet(false);
                navigate(currentUser ? "/wtb" : "/auth", { state: { from: location.pathname } });
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                    Looking to buy
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>
                    Post a want-to-buy request and let local sellers reach out.
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${m.border}` }}
                >
                  <Search size={17} style={{ color: m.text }} strokeWidth={2.2} />
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
