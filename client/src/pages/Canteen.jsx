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
    <div className="min-h-screen bg-[#FFFDF9] text-[#2B1E16]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Warm Butter-Gold & Sand Hero Banner */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#EADBC1] bg-gradient-to-r from-[#F6D365] via-[#F9E396] to-[#F7EEDB] p-6 shadow-sm">
          <div>
            <span className="inline-block rounded-full bg-[#A8641D]/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#8C5115]">
              Freshly Prepared • Seat Delivery
            </span>
            <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-black tracking-tight text-[#2B1E16] sm:text-3xl">
              <Popcorn className="h-7 w-7 text-[#A8641D]" />
              iMovies Pro <span className="text-[#A8641D]">Cinema Canteen</span>
            </h1>
            <p className="mt-1 text-xs font-medium text-[#5C4634]">
              Order gourmet snacks directly to your seat with any confirmed ticket. Cash orders include a ₹13 handling fee.
            </p>
          </div>

          {loyalty && (
            <div className="rounded-2xl border border-[#E2C89D] bg-[#FFFDF9]/90 px-4 py-3 text-xs shadow-sm backdrop-blur-sm">
              <p className="flex items-center gap-1.5 font-extrabold text-[#A8641D]">
                <Award className="h-4 w-4 text-[#D9822B]" /> 7 Movies in 57 Days Reward:{" "}
                {loyalty.moviesWatchedIn57Days}/{loyalty.requiredMovies}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[#5C4634]">
                {loyalty.eligible
                  ? `ACTIVE: 36% Off + Free ${loyalty.popcornBucketReward}`
                  : `Watch ${loyalty.requiredMovies - loyalty.moviesWatchedIn57Days} more movie(s) within 57 days for 36% off + Popcorn Bucket!`}
              </p>
            </div>
          )}
        </div>

        {statusMsg && (
          <div className="mb-6 rounded-2xl border border-[#D4B483] bg-[#F7EEDB] px-4 py-3 text-xs font-bold text-[#7A4410]">
            {statusMsg}
          </div>
        )}

        {/* Admin / Manager Add Canteen Item Form */}
        {isElevated && (
          <form
            onSubmit={handleAddItem}
            className="mb-8 space-y-3 rounded-3xl border border-[#EADBC1] bg-[#F7EEDB] p-6 shadow-sm"
          >
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#8C5115]">
              Add New Menu Item
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Snack / Popcorn Name *"
                className="rounded-xl border border-[#E2C89D] bg-[#FFFDF9] px-3.5 py-2.5 text-xs text-[#2B1E16] placeholder-[#9C846C] outline-none focus:border-[#A8641D]"
              />
              <input
                type="number"
                min="1"
                required
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                placeholder="Price ₹ *"
                className="rounded-xl border border-[#E2C89D] bg-[#FFFDF9] px-3.5 py-2.5 text-xs text-[#2B1E16] placeholder-[#9C846C] outline-none focus:border-[#A8641D]"
              />
              <input
                type="url"
                value={newItem.imageUrl}
                onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                placeholder="Food Photo URL (https://...)"
                className="rounded-xl border border-[#E2C89D] bg-[#FFFDF9] px-3.5 py-2.5 text-xs text-[#2B1E16] placeholder-[#9C846C] outline-none focus:border-[#A8641D]"
              />
            </div>

            <textarea
              rows={2}
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="Food description (ingredients, size, flavor, or combo details...)"
              className="w-full rounded-xl border border-[#E2C89D] bg-[#FFFDF9] px-3.5 py-2.5 text-xs text-[#2B1E16] placeholder-[#9C846C] outline-none focus:border-[#A8641D]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5C4634]">
                <input
                  type="checkbox"
                  checked={newItem.isPopcornBucketReward}
                  onChange={(e) =>
                    setNewItem({ ...newItem, isPopcornBucketReward: e.target.checked })
                  }
                  className="accent-[#A8641D]"
                />
                Set as 7-in-57 Free Popcorn Bucket
              </label>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-[#A8641D] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#8C5115]"
              >
                <Plus className="h-3.5 w-3.5" /> Publish Item
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr,350px]">
          {/* Warm Sand-Cream Food Menu Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {items.length === 0 ? (
              <div className="col-span-2 rounded-3xl border border-[#EADBC1] bg-[#F7EEDB] p-10 text-center text-xs font-medium text-[#7A624D]">
                No canteen items added yet. Admin or Head Manager can publish snacks above.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#EADBC1] bg-[#F7EEDB] shadow-sm transition hover:-translate-y-0.5 hover:border-[#D4B483] hover:shadow-md"
                >
                  <div>
                    <div className="p-3 pb-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-40 w-full rounded-2xl bg-[#FFFDF9] object-cover"
                        />
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-[#FFFDF9] text-[#D4B483]">
                          <Popcorn className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-[#2B1E16]">{item.name}</h3>
                        <span className="rounded-full bg-[#F2C94C] px-3 py-0.5 text-xs font-black text-[#2B1E16]">
                          ₹{item.price}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#6B533E]">
                          {item.description}
                        </p>
                      )}

                      {item.isPopcornBucketReward && (
                        <span className="mt-2.5 inline-block rounded-full bg-[#A8641D]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#8C5115]">
                          7-in-57 Loyalty Popcorn Bucket
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#EADBC1] bg-[#FFFDF9]/60 px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#8C735B]">
                      {item.category || "Snacks"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item._id, -1)}
                        className="h-7 w-7 rounded-full border border-[#D4B483] bg-[#FFFDF9] text-xs font-extrabold text-[#2B1E16] transition hover:bg-[#EADBC1]/50"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-black text-[#2B1E16]">
                        {cart[item._id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item._id, 1)}
                        className="h-7 w-7 rounded-full bg-[#A8641D] text-xs font-extrabold text-white transition hover:bg-[#8C5115]"
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
                          className="ml-1 text-[#B83A2D] hover:text-[#8F281E]"
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

          {/* Premium Cream & Caramel Checkout Box */}
          <div className="h-fit space-y-4 rounded-3xl border border-[#EADBC1] bg-[#F7EEDB] p-6 text-xs shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-black text-[#2B1E16]">
              <ShoppingBag className="h-4 w-4 text-[#A8641D]" /> Canteen Checkout
            </h2>

            {!canOrderFood ? (
              <p className="rounded-2xl border border-[#E2C89D] bg-[#FFFDF9] p-3.5 font-medium text-[#6B533E]">
                Book a movie ticket first to unlock Canteen ordering.
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block font-bold text-[#5C4634]">
                    Select Confirmed Ticket
                  </label>
                  <select
                    value={selectedBooking}
                    onChange={(e) => setSelectedBooking(e.target.value)}
                    className="w-full rounded-xl border border-[#E2C89D] bg-[#FFFDF9] px-3 py-2.5 font-medium text-[#2B1E16] outline-none focus:border-[#A8641D]"
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
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                      paymentMode === "ONLINE"
                        ? "border-[#A8641D] bg-[#A8641D] text-white"
                        : "border-[#E2C89D] bg-[#FFFDF9] text-[#5C4634]"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Online (₹0 fee)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("CASH")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                      paymentMode === "CASH"
                        ? "border-[#A8641D] bg-[#A8641D] text-white"
                        : "border-[#E2C89D] bg-[#FFFDF9] text-[#5C4634]"
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" /> Cash (+₹13 fee)
                  </button>
                </div>

                <div className="space-y-2 rounded-2xl border border-[#EADBC1] bg-[#FFFDF9] p-4">
                  <div className="flex justify-between font-medium text-[#6B533E]">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {discount36 > 0 && (
                    <div className="flex justify-between font-bold text-[#2E7D32]">
                      <span>7-in-57 Loyalty (36% Off)</span>
                      <span>-₹{discount36}</span>
                    </div>
                  )}
                  {cashFee > 0 && (
                    <div className="flex justify-between font-bold text-[#A8641D]">
                      <span>Cash Handling Fee</span>
                      <span>+₹13</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#EADBC1] pt-2.5 text-sm font-black text-[#2B1E16]">
                    <span>Total Payable</span>
                    <span>₹{finalTotal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={subtotal === 0}
                  onClick={handlePlaceOrder}
                  className="w-full rounded-full bg-[#A8641D] py-3 font-extrabold text-white shadow-sm transition hover:bg-[#8C5115] disabled:opacity-40"
                >
                  Place Canteen Order
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canteen;