import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  X,
  ShieldCheck,
  Lock,
  Clock,
  Smartphone,
  CreditCard,
  Landmark,
  Wallet,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import api from "../services/api";

const BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra"];
const WALLETS = ["Amazon Pay", "Paytm Wallet", "PhonePe Wallet", "Mobikwik"];
const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM UPI"];

const formatCardNumber = (val) =>
  val
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

const formatExpiry = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const detectCardBrand = (num) => {
  const clean = num.replace(/\s/g, "");
  if (clean.startsWith("4")) return "VISA";
  if (/^5[1-5]/.test(clean)) return "MASTERCARD";
  if (/^(60|65|81|82)/.test(clean)) return "RUPAY";
  return "CARD";
};

const PaymentGatewayModal = ({ order, onClose, onSuccess }) => {
  const [method, setMethod] = useState("UPI");
  const [upiMode, setUpiMode] = useState("QR");
  const [upiApp, setUpiApp] = useState("GPay");
  const [upiId, setUpiId] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [selectedWallet, setSelectedWallet] = useState(WALLETS[0]);

  const [secondsLeft, setSecondsLeft] = useState(300);
  const [stage, setStage] = useState("INPUT");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [order]);

  if (!order) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const validateInputs = () => {
    if (secondsLeft === 0) return "Seat hold session expired. Please re-select your seats.";
    if (method === "UPI" && upiMode === "ID") {
      if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
        return "Enter a valid UPI ID (for example: name@okaxis or 9876543210@ybl).";
      }
    }
    if (method === "CARD") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 16) return "Enter a valid 16-digit card number.";
      if (!cardName.trim()) return "Enter the cardholder's name.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) return "Enter expiry in MM/YY format.";
      if (cardCvv.length < 3) return "Enter a valid 3 or 4-digit CVV.";
    }
    return "";
  };

  const buildPaymentDetails = () => {
    if (method === "UPI") {
      return upiMode === "QR" ? `${upiApp} QR Scan` : `${upiApp} (${upiId.trim()})`;
    }
    if (method === "CARD") {
      const last4 = cardNumber.replace(/\s/g, "").slice(-4);
      return `${detectCardBrand(cardNumber)} •••• ${last4}`;
    }
    if (method === "NETBANKING") return selectedBank;
    return selectedWallet;
  };

  const handlePayNow = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStage("PROCESSING");

    try {
      await new Promise((r) => setTimeout(r, 900));
      setStage("VERIFYING");
      await new Promise((r) => setTimeout(r, 900));

      const { data } = await api.post("/payments/verify", {
        orderId: order.orderId,
        showId: order.showId,
        seats: order.seats,
        totalAmount: order.totalAmount,
        paymentMethod: method,
        paymentDetails: buildPaymentDetails(),
      });

      setStage("SUCCESS");
      setTimeout(() => {
        onSuccess(data.booking);
      }, 1100);
    } catch (err) {
      setStage("INPUT");
      setError(err.response?.data?.message || "Payment verification failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-[#0f172a] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#111827] via-[#1e1b4b] to-[#111827] px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">iMovies SecurePay Gateway</h2>
              <p className="text-[11px] text-slate-400">
                256-bit TLS Encrypted • Order <span className="font-mono">{order.orderId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              {mins}:{secs}
            </div>
            {stage === "INPUT" && (
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {stage !== "INPUT" ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            {stage === "SUCCESS" ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="mt-4 text-2xl font-black text-white">Payment Successful!</h3>
                <p className="mt-1 text-sm text-slate-400">
                  ₹{order.totalAmount} paid via {buildPaymentDetails()}. Generating your QR E-Ticket...
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-red-500" />
                <h3 className="mt-4 text-lg font-bold text-white">
                  {stage === "PROCESSING"
                    ? "Connecting to Payment Network..."
                    : "Verifying Bank / UPI Confirmation..."}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Do not refresh or close this window while your seats are being confirmed.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-[230px,1fr]">
            <div className="border-b border-slate-800 bg-[#0b1120] p-4 md:border-b-0 md:border-r">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Payment Options
              </p>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
                {[
                  { id: "UPI", label: "UPI / QR Code", icon: Smartphone },
                  { id: "CARD", label: "Credit / Debit Card", icon: CreditCard },
                  { id: "NETBANKING", label: "Net Banking", icon: Landmark },
                  { id: "WALLET", label: "Mobile Wallets", icon: Wallet },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMethod(m.id);
                        setError("");
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                        method === m.id
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs">
                <p className="font-bold text-white">{order.movieTitle}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {order.theatreName} • {order.seats.join(", ")}
                </p>
                <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>Tickets</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Convenience Fee</span>
                    <span>₹{order.convenienceFee}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18%)</span>
                    <span>₹{order.gst}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo ({order.promoCode})</span>
                      <span>-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                    <span>Total</span>
                    <span>₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6">
              <div>
                {method === "UPI" && (
                  <div>
                    <div className="mb-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUpiMode("QR")}
                        className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                          upiMode === "QR"
                            ? "border-red-500 bg-red-600/15 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        Scan UPI QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiMode("ID")}
                        className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                          upiMode === "ID"
                            ? "border-red-500 bg-red-600/15 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        Enter UPI ID
                      </button>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {UPI_APPS.map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setUpiApp(app)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            upiApp === app
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>

                    {upiMode === "QR" ? (
                      <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
                        <div className="rounded-2xl bg-white p-3">
                          <QRCodeCanvas value={order.upiUri} size={156} />
                        </div>
                        <p className="mt-3 text-xs font-semibold text-white">
                          Scan with {upiApp} or any UPI app to pay ₹{order.totalAmount}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400">
                          VPA: {order.merchantVpa}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <label className="block text-xs font-semibold text-slate-300">
                          Enter Your {upiApp} UPI ID
                        </label>
                        <input
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okaxis / mobile@ybl"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                        />
                        <p className="text-[11px] text-slate-400">
                          A collect request for ₹{order.totalAmount} will be verified instantaneously.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {method === "CARD" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Credit / Debit Card</h3>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                        {detectCardBrand(cardNumber)}
                      </span>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Card Number</label>
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4532 1100 2200 3300"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Cardholder Name</label>
                      <input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Name printed on card"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Valid Thru (MM/YY)</label>
                        <input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="08/29"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="•••"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {method === "NETBANKING" && (
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-white">Select Your Bank</h3>
                    <div className="space-y-2">
                      {BANKS.map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
                            selectedBank === bank
                              ? "border-red-500 bg-red-600/15 text-white"
                              : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          <span>{bank}</span>
                          {selectedBank === bank && <CheckCircle2 className="h-4 w-4 text-red-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {method === "WALLET" && (
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-white">Select Mobile Wallet</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {WALLETS.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSelectedWallet(w)}
                          className={`rounded-xl border p-3.5 text-left text-xs font-bold ${
                            selectedWallet === w
                              ? "border-red-500 bg-red-600/15 text-white"
                              : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4">
                {error && (
                  <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handlePayNow}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
                >
                  <Lock className="h-4 w-4" />
                  Pay ₹{order.totalAmount} Securely
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-500">
                  Instant e-ticket & QR confirmation issued immediately upon verification.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGatewayModal;