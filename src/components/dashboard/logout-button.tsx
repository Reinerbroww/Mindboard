"use client";

import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </form>
  );
}