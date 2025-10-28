import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    if (!path) return Response.json({ error: "Path required" }, { status: 400 });

    await revalidatePath(path);
    return Response.json({ success: true, path });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return Response.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
