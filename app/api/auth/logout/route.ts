import { NextResponse } from "next/server"; import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request:Request){const supabase=await createSupabaseServerClient();await supabase.auth.signOut();return NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}})}
