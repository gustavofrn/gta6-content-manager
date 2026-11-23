import { execFile } from "child_process";
import path from "path";

/** Estas funções dependem de APIs de Node (child_process / fs). */
export const runtime = "nodejs";

/** Caminho absoluto de um arquivo dentro da pasta local de mídias. */
export function mediaAbsolutePath(storageKey: string): string {
  return path.join(process.cwd(), "media", storageKey);
}

/** Verifica se o binário `ffmpeg` está disponível no servidor (timeout 5s). */
export function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("ffmpeg", ["-version"], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

type ExportClipParams = {
  inputPath: string;
  outputPath: string;
  startSec: number;
  endSec: number;
};

/**
 * Exporta um trecho em 9:16. A imagem original fica centralizada sobre um
 * fundo ampliado e desfocado para evitar cortes agressivos em vídeos 16:9.
 */
export function exportClip({
  inputPath,
  outputPath,
  startSec,
  endSec,
}: ExportClipParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const durationSec = endSec - startSec;
    const filter = [
      "[0:v]split=2[background][foreground]",
      "[background]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:1[bg]",
      "[foreground]scale=1080:1380:force_original_aspect_ratio=decrease[fg]",
      "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]",
    ].join(";");

    execFile(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(startSec),
        "-i",
        inputPath,
        "-t",
        String(durationSec),
        "-filter_complex",
        filter,
        "-map",
        "[v]",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { timeout: 5 * 60 * 1000 },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}
