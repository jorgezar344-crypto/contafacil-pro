import { transition } from "@/lib/document-actions";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return transition(request, id, "archive", "archived"); }
