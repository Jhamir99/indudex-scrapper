import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// A problem (rings), a problem over, or news (both silent).
export type NoticeKind = "warn" | "ok" | "info";

export interface Notice {
  readonly title: string;
  readonly message: string;
  readonly kind?: NoticeKind;
}

export interface Notifier {
  notify(notice: Notice): Promise<void>;
}

export interface NtfySettings {
  // The channel the operator's ntfy app subscribes to (NTFY_TOPIC in .env); none, and notices are only logged.
  readonly topic: string | undefined;
  // Every notice is written here first: the alerts' log.
  readonly logPath: string;
  readonly server?: string;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

// https://docs.ntfy.sh/publish/#message-priority: 3 is the default and rings, 2 shows up without a sound.
const PRIORITY: Record<NoticeKind, number> = { warn: 3, ok: 2, info: 2 };
const TAG: Record<NoticeKind, string> = {
  warn: "warning",
  ok: "white_check_mark",
  info: "information_source",
};
const TRIES = 4;
const APART_MS = 20_000;
const EACH_MS = 20_000;

// Notices to the operator's phone through ntfy.sh (FR-7), as the legacy's ops/alert.sh. Between 22:00 and 09:00, the
// server's local time, every notice arrives silent (the operator's choice). The title and the tags go in the query
// string, which carries UTF-8 («publicación», «…»), where a header would not; the message is the body. A notice that
// cannot be sent is noted in the log and never fails the job that sent it.
export function ntfyNotifier(settings: NtfySettings): Notifier {
  const now = settings.now ?? (() => new Date());
  const send = settings.fetch ?? fetch;
  const sleep =
    settings.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((wake) => setTimeout(wake, milliseconds)));
  const server = settings.server ?? "https://ntfy.sh";
  const note = async (line: string) => {
    await mkdir(dirname(settings.logPath), { recursive: true });
    await appendFile(settings.logPath, `${line}\n`);
  };

  return {
    async notify({ title, message, kind = "warn" }) {
      const at = now();
      await note(
        `[${localStamp(at)}] ${title}: ${message.replaceAll("\n", " ")}`,
      );
      const topic = settings.topic?.trim();
      if (!topic) {
        await note("  not sent: no NTFY_TOPIC in .env");
        return;
      }
      const query = new URLSearchParams({
        title,
        priority: String(quietHour(at) ? 2 : PRIORITY[kind]),
        tags: TAG[kind],
      });
      const url = `${server}/${encodeURIComponent(topic)}?${query}`;
      let failure = "";
      for (let attempt = 1; attempt <= TRIES; attempt++) {
        try {
          const response = await send(url, {
            method: "POST",
            body: message,
            signal: AbortSignal.timeout(EACH_MS),
          });
          if (response.ok) return;
          failure = `HTTP ${response.status}`;
        } catch (error) {
          failure = error instanceof Error ? error.message : String(error);
        }
        if (attempt < TRIES) await sleep(APART_MS);
      }
      // The topic is the channel's secret: never written to the log.
      await note(`  not sent: ${failure}`);
    },
  };
}

export function quietHour(at: Date): boolean {
  const hour = at.getHours();
  return hour >= 22 || hour < 9;
}

// "2026-11-25 18:40:12" in the server's local time, as the legacy's alerts.log.
export function localStamp(at: Date): string {
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`;
}

const two = (value: number) => String(value).padStart(2, "0");
