import { transition } from "@/lib/document-actions";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json().catch(() => ({})); return transition(request, id, "review", "reviewed", typeof body.comment === "string" ? body.comment.slice(0, 1000) : undefined); }
