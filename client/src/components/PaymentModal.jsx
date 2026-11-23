import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  X,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building,
  Lock,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];

const PaymentModal = ({
  isOpen,
  onClose,
  onConfirmPayment,
  movieTitle,
  theatreName,
  showdate,
  showtime,
  seats,
  subtotal,
  discount,
  convenienceFee,
  totalAmount,
}) => {
  const [tab, setTab] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5-minute payment window
  const [processing, setProcessing] = useState(false);
  const [stepText, setStepText] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(300);
    setProcessing(false);
    setFormError("");
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const upiUri = `upi://pay?pa=imoviespro@okaxis&pn=iMovies%20Pro&am=${totalAmount.toFixed(
    2
  )}&cu=INR&tn=${encodeURIComponent(`${movieTitle} (${seats.join(",")})`)}`;

  const formatCard = (val) =>
    val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    setFormError("");

    if (tab === "UPI" && upiId && !upiId.includes("@")) {
      setFormError("Please enter a valid UPI ID (e.g., name@okicici) or scan the QR code.");
      return;
    }
    if (tab === "CARD") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setFormError("Enter a valid 16-digit card number.");
        return;
      }
      if (!cardName.trim() || expiry.length < 5 || cvv.length < 3) {
        setFormError("Please complete cardholder name, expiry (MM/YY), and CVV.");
        return;
      }
    }

    setProcessing(true);
    setStepText("Connecting securely to payment gateway...");
    await new Promise((r) => setTimeout(r, 900));
    setStepText("Verifying payment authorization...");
    await new Promise((r) => setTimeout(r, 900));

    try {
      await onConfirmPayment(tab === "NETBANKING" ? "WALLET" : tab);
    } catch (err) {
      setProcessing(false);
      setFormError(err?.response?.data?.message || "Payment failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-[#0f172a] shadow-2xl">
        {/* Top Gateway Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">iMovies Secure Checkout</h3>
              <p className="text-[11px] text-slate-400">256-bit SSL Encrypted • PCI-DSS Compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 font-mono text-xs font-bold text-amber-400">
              <Clock className="h-3.5 w-3.5" /> {mins}:{secs}
            </span>
            {!processing && (
              <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Order Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/50 px-6 py-3 text-xs">
          <div>
            <span className="font-bold text-white">{movieTitle}</span>
            <span className="text-slate-400">
              {" "}
              • {theatreName} ({showdate}, {showtime})
            </span>
          </div>
          <div className="font-semibold text-emerald-400">
            Seats: {seats.join(", ")} ({seats.length})
          </div>
        </div>

        {processing ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
            <h4 className="mt-4 text-lg font-bold text-white">{stepText}</h4>
            <p className="mt-1 text-xs text-slate-400">
              Please do not refresh or press the Back button...
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[200px,1fr]">
            {/* Left Method Selector */}
            <div className="flex border-b border-slate-800 bg-slate-900/40 md:flex-col md:border-b-0 md:border-r">
              {[
                { id: "UPI", label: "UPI / QR Code", icon: Smartphone },
                { id: "CARD", label: "Credit / Debit Card", icon: CreditCard },
                { id: "NETBANKING", label: "NetBanking", icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setTab(m.id);
                      setFormError("");
                    }}
                    className={`flex flex-1 items-center gap-2.5 px-4 py-3.5 text-left text-xs font-bold transition md:flex-initial ${
                      tab === m.id
                        ? "border-b-2 border-red-500 bg-red-600/15 text-white md:border-b-0 md:border-l-4"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-red-400" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Payment Form */}
            <form onSubmit={handlePayNow} className="p-6">
              {tab === "UPI" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center">
                    <div className="rounded-xl bg-white p-2.5">
                      <QRCodeCanvas value={upiUri} size={132} />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-white">
                      Scan with GPay, PhonePe, Paytm, or BHIM
                    </p>
                    <p className="text-[11px] text-slate-400">Merchant UPI: imoviespro@okaxis</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">
                      Or Enter UPI ID (Optional if scanned)
                    </label>
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@okicici"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {tab === "CARD" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">
                      Card Number
                    </label>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCard(e.target.value))}
                      placeholder="4532 •••• •••• 8890"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">
                      Name on Card
                    </label>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="FULL NAME"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm uppercase text-white outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-400">
                        Expiry (MM/YY)
                      </label>
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="08/29"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-400">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                        placeholder="•••"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {tab === "NETBANKING" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400">
                    Select Popular Indian Bank
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                  >
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">
                    You will authorize ₹{totalAmount} securely via {selectedBank}.
                  </p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="mt-5 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Tickets Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Internet Handling & GST</span>
                  <span>₹{convenienceFee}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-extrabold text-white">
                  <span>Total Payable</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              {formError && <p className="mt-3 text-xs font-medium text-red-400">{formError}</p>}

              <button
                type="submit"
                disabled={secondsLeft === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {tab === "UPI" ? `I Have Paid ₹${totalAmount} • Confirm Ticket` : `Pay ₹${totalAmount} Securely`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;