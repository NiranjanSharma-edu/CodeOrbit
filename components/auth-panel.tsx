"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthPanel() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const redirectTo = "http://localhost:3000";

  async function signInWithGithub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo, scopes: "repo read:user" }
    });

    if (error) {
      setMessage(error.message);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { name }, emailRedirectTo: redirectTo }
          });

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage(mode === "login" ? "Signed in. Redirecting..." : "Check your inbox to confirm your account.");
    if (mode === "login") {
      window.location.assign("/dashboard");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
    <Card className="glow-border">
      <CardHeader>
        <CardTitle className="text-2xl">{mode === "login" ? "Enter orbit" : "Create orbit key"}</CardTitle>
        <p className="text-sm text-slate-400">Secure workspace access for realtime coding rooms.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          ) : null}
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" required />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            minLength={6}
            required
          />
          <Button className="w-full" type="submit">
            {mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={signInWithGithub}>
            <Github className="mr-2 h-4 w-4" /> Login with GitHub
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account?" : "Already have an account?"}
        </Button>
        {message ? <p className="rounded-md border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">{message}</p> : null}
      </CardContent>
    </Card>
    </motion.div>
  );
}
