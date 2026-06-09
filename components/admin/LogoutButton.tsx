"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function sair() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={sair}
      style={{ background: "transparent", color: "#fff", border: "1px solid #ffffff66", borderRadius: 16, padding: "4px 12px", cursor: "pointer", fontSize: ".85rem" }}
    >
      Sair
    </button>
  );
}
