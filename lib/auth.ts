import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUserOrRedirect() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}
