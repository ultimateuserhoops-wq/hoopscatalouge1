import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "HOOPS · Admin Sign In" },
      { name: "description", content: "Sign in to manage the HOOPS catalog." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally { setBusy(false); }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Google sign-in failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-[#101010] border border-white/10 rounded-lg p-6">
        <div className="text-center">
          <h1 className="font-display tracking-widest text-3xl text-white">HOOPS<span className="text-[#FF4D00]">.</span></h1>
          <p className="text-[0.6rem] font-condensed tracking-widest text-white/50 uppercase mt-1">
            Admin sign in
          </p>
        </div>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email"
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password"
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white" />
        <button type="submit" disabled={busy}
          className="w-full py-2 rounded font-condensed tracking-widest text-xs font-bold text-white bg-[#FF4D00] hover:bg-[#e64500] disabled:opacity-50">
          {busy ? "…" : "SIGN IN"}
        </button>

        <div className="flex items-center gap-2 text-[0.55rem] font-condensed tracking-widest text-white/30 uppercase">
          <div className="flex-1 h-px bg-white/10" /> or <div className="flex-1 h-px bg-white/10" />
        </div>

        <button type="button" onClick={onGoogle} disabled={busy}
          className="w-full py-2 rounded font-condensed tracking-widest text-xs font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 7.1 29.3 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.3 2.4-5.3 0-9.7-3.1-11.3-7.4l-6.5 5C9.6 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C40.8 35.4 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>
        <a href="/" className="block text-center text-[0.55rem] font-condensed tracking-widest text-white/30 hover:text-white/60">← BACK TO CATALOG</a>
      </form>
    </main>
  );
}
