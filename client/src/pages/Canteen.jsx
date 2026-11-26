import React, { useEffect, useState } from "react";
import { Award, Banknote, CreditCard, Popcorn, Plus, ShoppingBag, Trash2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMPTY_CANTEEN_ITEM = {
  name: "",
  category: "Snacks",
  price: 150,
  imageUrl: "",
  description: "",
  isPopcornBucketReward: false,
};

const Canteen = () => {
  const { user } = useAuth();
  const isElevated = user?.role === "admin" || user?.role === "manager";

  const [items, setItems] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [canOrderFood, setCanOrderFood] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [cart, setCart] = useState({});
  const [paymentMode, setPaymentMode] = useState("ONLINE");
  const [statusMsg, setStatusMsg] = useState("");

  const [newItem, setNewItem] = useState(EMPTY_CANTEEN_ITEM);

  const loadCanteen = async () => {
    const { data } = await api.get("/canteen/items");
    setItems(data.items || []);
    setLoyalty(data.loyalty || null);
    setCanOrderFood(Boolean(data.canOrderFood));
    setBookings(data.bookings || []);
    if (data.bookings?.[0]?._id) {
      setSelectedBooking((prev) => prev || data.bookings[0]._id);
    }
  };

  useEffect(() => {
    loadCanteen();
  }, []);

  const updateQty = (itemId, delta) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] || 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[itemId];
      else copy[itemId] = next;
      return copy;
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * (cart[item._id] || 0), 0);
  const discount36 = loyalty?.eligible ? Math.round(subtotal * 0.36) : 0;
  const cashFee = paymentMode === "CASH" && subtotal > 0 ? 13 : 0;
  const finalTotal = Math.max(0, subtotal - discount36 + cashFee);

  const handlePlaceOrder = async () => {
    const orderItems = Object.entries(cart).map(([itemId, qty]) => ({ itemId, qty }));
    if (orderItems.length === 0) return;
    const { data } = await api.post("/canteen/orders", {
      bookingId: selectedBooking,
      items: orderItems,
      paymentMode,
    });
    setCart({});
    setStatusMsg(
      `Order placed (${data.order.paymentMode})! Paid ₹${data.order.finalAmount}${
        data.order.popcornBucketIncluded ? ` + Free ${data.order.popcornBucketIncluded}!` : ""
      }`
    );
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    await api.post("/canteen/items", {
      ...newItem,
      name: newItem.name.trim(),
      imageUrl: newItem.imageUrl.trim(),
      description: newItem.description.trim(),
    });
    setNewItem(EMPTY_CANTEEN_ITEM);
    setStatusMsg("Canteen item published.");
    loadCanteen();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Popcorn className="h-6 w-6 text-amber-400" />
            iMovies Pro <span className="text-red-500">Cinema Canteen</span>
          </h1>
          <p className="text-xs text-slate-400">
            Order snacks to your seat with any confirmed movie ticket. Cash orders include a ₹13 handling fee.
          </p>
        </div>

        {loyalty && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-amber-300">
              <Award className="h-4 w-4" /> 7 Movies in 57 Days Reward:{" "}
              {loyalty.moviesWatchedIn57Days}/{loyalty.requiredMovies}
            </p>
            <p className="text-[11px] text-slate-300">
              {loyalty.eligible
                ? `ACTIVE: 36% Off + Free ${loyalty.popcornBucketReward}`
                : `Watch ${loyalty.requiredMovies - loyalty.moviesWatchedIn57Days} more movie(s) within 57 days to unlock 36% off + Popcorn Bucket!`}
            </p>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          {statusMsg}
        </div>
      )}

      {isElevated && (
        <form
          onSubmit={handleAddItem}
          className="mb-8 space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Snack / Popcorn Name *"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <input
              type="number"
              min="1"
              required
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
              placeholder="Price ₹ *"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <input
              type="url"
              value={newItem.imageUrl}
              onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
              placeholder="Food Photo URL (https://...)"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>

          <textarea
            rows={2}
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Food description (ingredients, size, flavor, or combo details...)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 text-xs text-amber-300">
              <input
                type="checkbox"
                checked={newItem.isPopcornBucketReward}
                onChange={(e) =>
                  setNewItem({ ...newItem, isPopcornBucketReward: e.target.checked })
                }
              />
              Set as 7-in-57 Free Popcorn Bucket
            </label>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Canteen Item
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-xs text-slate-400">
              No canteen items added yet. Admin/Manager can add snacks above.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item._id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]"
              >
                <div>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-slate-900 text-slate-600">
                      <Popcorn className="h-8 w-8" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                      <span className="text-sm font-black text-emerald-400">₹{item.price}</span>
                    </div>

                    {item.description && (
                      <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                    )}

                    {item.isPopcornBucketReward && (
                      <span className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        7-in-57 Loyalty Popcorn Bucket
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-3">
                  <span className="text-[11px] text-slate-400">{item.category || "Snacks"}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item._id, -1)}
                      className="h-7 w-7 rounded-lg border border-slate-700 text-xs font-bold text-white"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-white">
                      {cart[item._id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item._id, 1)}
                      className="h-7 w-7 rounded-lg bg-red-600 text-xs font-bold text-white"
                    >
                      +
                    </button>
                    {isElevated && (
                      <button
                        type="button"
                        onClick={async () => {
                          await api.delete(`/canteen/items/${item._id}`);
                          loadCanteen();
                        }}
                        className="ml-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Checkout Box */}
        <div className="h-fit space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-5 text-xs">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <ShoppingBag className="h-4 w-4 text-red-400" /> Canteen Checkout
          </h2>

          {!canOrderFood ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              Book a movie ticket first to unlock Canteen ordering.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-slate-400">Select Confirmed Ticket</label>
                <select
                  value={selectedBooking}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                >
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.movieTitle} ({b.bookingId}) — Seats {b.seats.join(", ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold ${
                    paymentMode === "ONLINE"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Online (₹0 fee)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("CASH")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold ${
                    paymentMode === "CASH"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" /> Cash (+₹13 fee)
                </button>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <div className="flex justify-between text-slate-400">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discount36 > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>7-in-57 Loyalty (36% Off)</span>
                    <span>-₹{discount36}</span>
                  </div>
                )}
                {cashFee > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Cash Handling Fee</span>
                    <span>+₹13</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                  <span>Total Payable</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={subtotal === 0}
                onClick={handlePlaceOrder}
                className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-40"
              >
                Place Canteen Order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Canteen;