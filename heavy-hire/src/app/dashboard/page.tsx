"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  status: string;
  equipment: { title: string; owner: { name: string } };
  client?: { name: string; email: string; phone: string | null };
}

interface EquipmentListing {
  id: string;
  title: string;
  category: string;
  pricePerDay: number;
  isApproved: boolean;
  isAvailable: boolean;
  images: string[];
}

const categories = ["CONSTRUCTION", "AGRICULTURAL", "HEAVY_TRANSPORT", "REFRIGERATED"];

type UploadPurpose = "equipment" | "verification" | "booking-photo";

async function uploadImage(file: File, purpose: UploadPurpose = "equipment"): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to prepare upload");

  const putRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Failed to upload image");

  return data.publicUrl;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

function MessageThread({ bookingId }: { bookingId: string }) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id as string | undefined;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/bookings/${bookingId}/messages`)
      .then((r) => r.json())
      .then(setMessages)
      .finally(() => setLoading(false));
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && messages.length === 0) load();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setMessages((prev) => [...prev, data]);
      setContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={toggle}
        className="text-sm font-semibold text-primary-600"
      >
        {open ? "Hide messages" : "Messages"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet. Say hello.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.sender.id === myId
                      ? "ml-auto bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.sender.id !== myId && (
                    <p className="text-xs font-semibold mb-0.5 opacity-70">{m.sender.name}</p>
                  )}
                  <p>{m.content}</p>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <form onSubmit={send} className="flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function VerificationWidget() {
  const [status, setStatus] = useState<"loading" | "not_submitted" | "pending" | "verified">("loading");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("not_submitted"));
  };

  useEffect(load, []);

  const submit = async () => {
    if (!file) return;
    setSubmitting(true);
    setError("");
    try {
      const idDocumentUrl = await uploadImage(file, "verification");
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idDocumentUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setFile(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") return null;

  if (status === "verified") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 flex items-center gap-2">
        <span className="text-green-700 font-semibold">✓ Identity verified</span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-yellow-800 font-semibold">ID submitted — pending review</p>
        <p className="text-sm text-yellow-700 mt-1">
          An admin will review your document shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <p className="font-semibold mb-1">Verify your identity</p>
      <p className="text-sm text-gray-600 mb-3">
        Upload a photo of your national ID or driver's license to get a verified badge.
      </p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-sm"
        />
        <button
          onClick={submit}
          disabled={!file || submitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

function BookingConditionAction({
  booking,
  onUpdated,
}: {
  booking: Booking;
  onUpdated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const action = booking.status === "ACTIVE" ? "complete" : "pickup";
  const label = booking.status === "ACTIVE" ? "Mark Returned" : "Mark Picked Up";

  if (!["PENDING", "CONFIRMED", "ACTIVE"].includes(booking.status)) {
    return null;
  }

  const submit = async () => {
    if (!file) return;
    setSubmitting(true);
    setError("");
    try {
      const photoUrl = await uploadImage(file, "booking-photo");
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, photos: [photoUrl] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update booking");
      setFile(null);
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-700 mb-2">
        {label} — upload a condition photo
      </p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-sm"
        />
        <button
          onClick={submit}
          disabled={!file || submitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "Saving..." : label}
        </button>
      </div>
    </div>
  );
}

function ClientBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading your bookings...</p>;
  if (bookings.length === 0) return <p className="text-gray-500">You haven't booked any equipment yet.</p>;

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <div key={b.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{b.equipment.title}</p>
              <p className="text-sm text-gray-600">
                {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()} ({b.totalDays} days)
              </p>
              <p className="text-sm text-gray-600">Owner: {b.equipment.owner.name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary-600">{b.totalPrice.toLocaleString()} RWF</p>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{b.status}</span>
            </div>
          </div>
          <MessageThread bookingId={b.id} />
        </div>
      ))}
    </div>
  );
}

interface SubscriptionInfo {
  subscriptionTier: string;
  listingCount: number;
  listingLimit: number | null;
}

function OwnerPanel() {
  const [listings, setListings] = useState<EquipmentListing[]>([]);
  const [incoming, setIncoming] = useState<Booking[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: categories[0],
    description: "",
    pricePerDay: "",
    location: "",
    city: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/equipment?owner=me").then((r) => r.json()),
      fetch("/api/bookings?as=owner").then((r) => r.json()),
      fetch("/api/owner/profile").then((r) => r.json()),
    ])
      .then(([eq, bk, sub]) => {
        setListings(eq);
        setIncoming(bk);
        setSubscription(sub);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const atLimit = Boolean(
    subscription?.listingLimit !== null &&
      subscription &&
      subscription.listingCount >= (subscription.listingLimit as number)
  );

  const submitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      let images: string[] = [];
      if (imageFile) {
        setUploading(true);
        try {
          images = [await uploadImage(imageFile)];
        } finally {
          setUploading(false);
        }
      }

      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerDay: Number(form.pricePerDay),
          images,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create listing");
      }
      setForm({ title: "", category: categories[0], description: "", pricePerDay: "", location: "", city: "" });
      setImageFile(null);
      setImagePreview("");
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading your listings...</p>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-bold">Your Equipment ({listings.length})</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            disabled={!showForm && atLimit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showForm ? "Cancel" : "+ Add Equipment"}
          </button>
        </div>

        {subscription && (
          <p className="text-sm text-gray-500 mb-4">
            {subscription.subscriptionTier} plan · {subscription.listingCount}
            {subscription.listingLimit !== null ? ` / ${subscription.listingLimit}` : ""} listings used
            {atLimit && " — upgrade your plan to add more"}
          </p>
        )}

        {showForm && (
          <form onSubmit={submitListing} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
            <input
              required
              placeholder="Title"
              className="w-full border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              className="w-full border rounded px-3 py-2"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
            <textarea
              required
              placeholder="Description (min 10 characters)"
              className="w-full border rounded px-3 py-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Price per day (RWF)"
              className="w-full border rounded px-3 py-2"
              value={form.pricePerDay}
              onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
            />
            <input
              required
              placeholder="Location (address/area)"
              className="w-full border rounded px-3 py-2"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <input
              required
              placeholder="City"
              className="w-full border rounded px-3 py-2"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Photo (optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  setImagePreview(file ? URL.createObjectURL(file) : "");
                }}
                className="w-full text-sm"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 h-32 w-full object-cover rounded-lg"
                />
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-primary-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? (uploading ? "Uploading photo..." : "Saving...") : "Submit for approval"}
            </button>
          </form>
        )}

        {listings.length === 0 ? (
          <p className="text-gray-500">You haven't listed any equipment yet.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                      🏗️
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.category.replace("_", " ")} — {item.pricePerDay.toLocaleString()} RWF/day</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${item.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {item.isApproved ? "Approved" : "Pending approval"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Incoming Bookings ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {incoming.map((b) => (
              <div key={b.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{b.equipment.title}</p>
                    <p className="text-sm text-gray-600">Client: {b.client?.name} ({b.client?.phone || b.client?.email})</p>
                    <p className="text-sm text-gray-600">
                      {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{b.totalPrice.toLocaleString()} RWF</p>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{b.status}</span>
                  </div>
                </div>
                <MessageThread bookingId={b.id} />
                <BookingConditionAction booking={b} onUpdated={loadData} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminStats {
  users: { total: number; clients: number; owners: number; admins: number };
  equipment: { total: number; pendingApproval: number; byCategory: Record<string, number> };
  bookings: { total: number; byStatus: Record<string, number> };
  revenue: { gmv: number; commission: number };
  openDisputes: number;
  recentBookings: {
    id: string;
    equipmentTitle: string;
    clientName: string;
    totalPrice: number;
    status: string;
    createdAt: string;
  }[];
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${accent || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function AdminStatsOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading platform stats...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return null;

  const statusOrder = ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "DISPUTED"];
  const categoryOrder = ["CONSTRUCTION", "AGRICULTURAL", "HEAVY_TRANSPORT", "REFRIGERATED"];

  return (
    <div className="space-y-8 mb-10">
      <div>
        <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.users.total.toLocaleString()} />
          <StatCard label="Owners" value={stats.users.owners.toLocaleString()} />
          <StatCard label="Clients" value={stats.users.clients.toLocaleString()} />
          <StatCard label="Equipment Listed" value={stats.equipment.total.toLocaleString()} />
          <StatCard
            label="Gross Bookings Value"
            value={`${stats.revenue.gmv.toLocaleString()} RWF`}
            accent="text-primary-600"
          />
          <StatCard
            label="Platform Commission"
            value={`${stats.revenue.commission.toLocaleString()} RWF`}
            accent="text-primary-600"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.equipment.pendingApproval.toLocaleString()}
            accent={stats.equipment.pendingApproval > 0 ? "text-yellow-600" : undefined}
          />
          <StatCard
            label="Open Disputes"
            value={stats.openDisputes.toLocaleString()}
            accent={stats.openDisputes > 0 ? "text-red-600" : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold mb-3">Bookings by Status</h3>
          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            {statusOrder.map((s) => (
              <div key={s} className="flex justify-between text-sm">
                <span className="text-gray-600">{s}</span>
                <span className="font-semibold">{stats.bookings.byStatus[s] ?? 0}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold">{stats.bookings.total}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-3">Equipment by Category</h3>
          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            {categoryOrder.map((c) => (
              <div key={c} className="flex justify-between text-sm">
                <span className="text-gray-600">{c.replace("_", " ")}</span>
                <span className="font-semibold">{stats.equipment.byCategory[c] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3">Recent Bookings</h3>
        {stats.recentBookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
            {stats.recentBookings.map((b) => (
              <div key={b.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.equipmentTitle}</p>
                  <p className="text-sm text-gray-600">
                    {b.clientName} · {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">{b.totalPrice.toLocaleString()} RWF</p>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PendingVerificationUser {
  id: string;
  name: string;
  email: string;
  role: string;
  idDocumentUrl: string;
}

function PendingVerifications() {
  const [users, setUsers] = useState<PendingVerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/users?pending=true")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id: string, verified: boolean) => {
    setBusyId(id);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-4">Pending ID Verifications ({users.length})</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No IDs awaiting review.</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <a href={u.idDocumentUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={u.idDocumentUrl}
                    alt="ID document"
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                </a>
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-gray-600">{u.email} · {u.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === u.id}
                  onClick={() => decide(u.id, true)}
                  className="px-3 py-1 bg-green-600 text-white rounded font-semibold disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === u.id}
                  onClick={() => decide(u.id, false)}
                  className="px-3 py-1 bg-red-600 text-white rounded font-semibold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPanel() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/equipment?pending=true")
      .then((r) => r.json())
      .then(setPending)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      if (approve) {
        await fetch(`/api/equipment/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true }),
        });
      } else {
        await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminStatsOverview />

      <PendingVerifications />

      <h2 className="text-xl font-bold mb-4">Pending Approvals ({pending.length})</h2>
      {loading ? (
        <p className="text-gray-500">Loading pending listings...</p>
      ) : pending.length === 0 ? (
        <p className="text-gray-500">No listings awaiting approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-gray-600">
                  {item.category.replace("_", " ")} — {item.pricePerDay.toLocaleString()} RWF/day — by {item.owner.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item.id, true)}
                  className="px-3 py-1 bg-green-600 text-white rounded font-semibold disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === item.id}
                  onClick={() => decide(item.id, false)}
                  className="px-3 py-1 bg-red-600 text-white rounded font-semibold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    redirect("/auth/login");
  }

  const role = (session!.user as any)?.role as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="font-bold text-xl">HeavyHire Dashboard</Link>
            <div className="flex items-center gap-4">
              <Link
                href="/equipment"
                className="text-sm text-primary-600 font-semibold hover:text-primary-700"
              >
                Browse Equipment
              </Link>
              <span className="text-sm text-gray-600">
                {session!.user?.name} · {role}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-red-600 font-semibold"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {role === "OWNER" ? "Owner Dashboard" : role === "ADMIN" ? "Admin Dashboard" : "My Bookings"}
        </h1>

        {(role === "OWNER" || role === "CLIENT") && <VerificationWidget />}

        {role === "OWNER" && <OwnerPanel />}
        {role === "ADMIN" && <AdminPanel />}
        {role === "CLIENT" && <ClientBookings />}
      </div>
    </div>
  );
}
