import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => {
        // Authenticate user — reject unauthenticated uploads
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async ({ blob: _blob, tokenPayload: _tokenPayload }) => {
        // Save blob URL to database or trigger further processing
        // _tokenPayload contains { userId } from onBeforeGenerateToken
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
