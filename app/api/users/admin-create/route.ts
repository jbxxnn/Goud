import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/server-supabase";
import { createUserAndProfile } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin, staff, or midwife
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || !["admin", "staff", "midwife"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Only admins or staff can create users" }, { status: 403 });
    }

    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      role = "client",
      address,
      postal_code,
      house_number,
      street_name,
      city,
      birth_date,
      midwife_id
    } = await req.json();

    if (!email || !first_name || !last_name) {
      return NextResponse.json({ error: "Email, first name, and last name are required" }, { status: 400 });
    }

    // Check if email exists
    const serviceSupabase = getServiceSupabase();
    const { data: existing } = await serviceSupabase
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Create user via Admin API
    const newUser = await createUserAndProfile({
      email,
      firstName: first_name,
      lastName: last_name,
    });

    // Update role and other profile fields in the users table
    await serviceSupabase
      .from("users")
      .update({ 
        role, 
        phone: phone || null,
        address: address || null,
        postal_code: postal_code || null,
        house_number: house_number || null,
        street_name: street_name || null,
        city: city || null,
        birth_date: birth_date || null,
        midwife_id: midwife_id || null
      })
      .eq("id", newUser.id);

    // Fetch the full new user record
    const { data: userData, error: fetchError } = await serviceSupabase
      .from("users")
      .select("*")
      .eq("id", newUser.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, data: userData });
  } catch (err) {
    console.error("Admin user creation error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to create user" 
    }, { status: 500 });
  }
}
