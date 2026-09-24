import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { UserFacingError, errorResponse } from "@/lib/api/errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("maps")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("Delete map error:", error);
      return errorResponse(
        new UserFacingError("Could not delete map.", 500),
        "Could not delete map."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "Could not delete map.");
  }
}
