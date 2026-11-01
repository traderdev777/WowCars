import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Constraints
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_FILES_PER_REQUEST = 10;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/**
 * Inspect magic bytes of the file buffer to prevent extension spoofing
 */
function verifyMagicBytes(buffer: Buffer): { valid: boolean; ext: string } {
  if (buffer.length < 12) return { valid: false, ext: "" };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: ".png" };
  }

  // WebP: 'RIFF' .... 'WEBP'
  const isRiff = buffer.subarray(0, 4).toString("ascii") === "RIFF";
  const isWebp = buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (isRiff && isWebp) {
    return { valid: true, ext: ".webp" };
  }

  return { valid: false, ext: "" };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No image files provided in the 'photos' field." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Cannot upload more than ${MAX_FILES_PER_REQUEST} photos per request.` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "cars");
    await fs.mkdir(uploadDir, { recursive: true });

    // Storage quota protection (Max 500 MB upload folder limit)
    try {
      const dirEntries = await fs.readdir(uploadDir);
      let totalDirBytes = 0;
      for (const entry of dirEntries) {
        try {
          const s = await fs.stat(path.join(uploadDir, entry));
          totalDirBytes += s.size;
        } catch {}
      }
      if (totalDirBytes > 500 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Server storage quota exceeded. Please contact platform administrator." },
          { status: 507 }
        );
      }
    } catch {}

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (typeof file === "string" || !file.name) continue;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 8MB size limit.` },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        return NextResponse.json(
          { error: `File "${file.name}" is not an allowed image format (JPEG, PNG, WebP only).` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Verify magic bytes (prevent executable spoofing or SVG XSS)
      const { valid, ext } = verifyMagicBytes(buffer);
      if (!valid) {
        return NextResponse.json(
          { error: `File "${file.name}" failed binary header validation. Upload real JPEG, PNG, or WebP images.` },
          { status: 400 }
        );
      }

      // Generate secure randomized filename: car_<timestamp>_<randomHex>.<ext>
      const randomHex = crypto.randomBytes(8).toString("hex");
      const secureFileName = `car_${Date.now()}_${randomHex}${ext}`;
      const filePath = path.join(uploadDir, secureFileName);

      await fs.writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/cars/${secureFileName}`);
    }

    return NextResponse.json({
      success: true,
      count: uploadedUrls.length,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing the upload." },
      { status: 500 }
    );
  }
}
