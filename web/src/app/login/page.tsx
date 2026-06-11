"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_USERS = [
  {
    email: "admin@his.local",
    password: "his@1234",
    role: "Admin",
    icon: "⚙️",
    desc: "Full system access",
    color: "from-slate-700 to-slate-900",
    badge: "bg-slate-100 text-slate-700",
  },
  {
    email: "reception@his.local",
    password: "his@1234",
    role: "Receptionist",
    icon: "🧾",
    desc: "Registration & appointments",
    color: "from-blue-600 to-blue-800",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    email: "nurse@his.local",
    password: "his@1234",
    role: "Nurse",
    icon: "💉",
    desc: "Vitals & triage",
    color: "from-teal-600 to-teal-800",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    email: "dr.mehta@his.local",
    password: "his@1234",
    role: "Doctor",
    icon: "🩺",
    desc: "General Medicine",
    color: "from-violet-600 to-violet-800",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    email: "dr.patel@his.local",
    password: "his@1234",
    role: "Doctor",
    icon: "❤️",
    desc: "Cardiology",
    color: "from-rose-600 to-rose-800",
    badge: "bg-rose-100 text-rose-700",
  },
  {
    email: "billing@his.local",
    password: "his@1234",
    role: "Billing",
    icon: "💰",
    desc: "Bills & payments",
    color: "from-amber-600 to-amber-800",
    badge: "bg-amber-100 text-amber-700",
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const router = useRouter();

  async function loginAs(user: (typeof DEMO_USERS)[0]) {
    setLoading(user.email);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: user.email, password: user.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || `Login failed (${res.status})`);
        return;
      }
      setAuth(data.access_token, data.user);
      router.replace("/dashboard");
    } catch {
      setError("Cannot connect to API. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur mb-4 text-4xl shadow-xl">
          🏥
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">HIS Portal</h1>
        <p className="text-blue-200 mt-2 text-base">Hospital Information System — Healthcare</p>
        <p className="text-blue-300/60 mt-1 text-sm">Click any role to sign in instantly</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 w-full max-w-3xl bg-red-500/20 border border-red-400/40 text-red-200 text-sm px-4 py-3 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
        {DEMO_USERS.map((user) => {
          const isLoading = loading === user.email;
          return (
            <button
              key={user.email}
              onClick={() => loginAs(user)}
              disabled={loading !== null}
              className={`
                relative bg-gradient-to-br ${user.color}
                rounded-2xl p-5 text-left shadow-lg
                hover:scale-105 hover:shadow-2xl
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                border border-white/10
              `}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="text-3xl mb-3">{user.icon}</div>
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.badge}`}>
                  {user.role}
                </span>
              </div>
              <p className="text-white font-semibold mt-2 text-base">{user.desc}</p>
              <p className="text-white/50 text-xs mt-1 font-mono">{user.email}</p>
            </button>
          );
        })}
      </div>

      <p className="text-blue-400/50 text-xs mt-8">
        All accounts use password: <span className="font-mono text-blue-300/60">his@1234</span>
      </p>
    </div>
  );
}
