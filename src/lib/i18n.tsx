import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useUiLanguage, type AppLanguage } from "@/lib/language";

/**
 * Interface copy. This is deliberately separate from the language a map's
 * content is generated in, so switching the interface never changes how
 * AI output for an existing map is written.
 */
export type MessageKey = keyof typeof MESSAGES.en;

const MESSAGES = {
  en: {
    "nav.backToDashboard": "Dashboard",

    "dashboard.greeting.morning": "Good morning",
    "dashboard.greeting.afternoon": "Good afternoon",
    "dashboard.greeting.evening": "Good evening",
    "dashboard.tagline": "Build a mind map. See how everything connects.",
    "dashboard.create": "Create new map",
    "dashboard.section": "Your mind maps",
    "dashboard.counts": "{maps} maps · {concepts} concepts",
    "dashboard.empty.title": "Your first map is one prompt away.",
    "dashboard.empty.body":
      "Upload a lecture slide, PDF, or notes and get a structured mind map you can explore and expand.",
    "dashboard.empty.cta": "Create your first map",

    "map.concepts": "{n} concepts",
    "map.concept": "1 concept",
    "map.open": "Open map",
    "map.lastEdited": "Edited {date}",

    "board.save": "Save",
    "board.saving": "Saving...",
    "board.saved": "Saved",
    "board.unsaved": "Unsaved changes",
    "board.delete": "Delete",
    "board.deleteConfirm": "Delete this map and all of its nodes?",
    "board.deleteCancel": "Cancel",
    "board.deleteConfirmAction": "Delete",
    "board.deleting": "Deleting...",
    "board.deleteFailed": "Could not delete the map.",
    "board.saveFailed": "Could not save the map.",

    "node.explain": "Explain",
    "node.explainConnection": "Explain connection",
    "node.expand": "Expand",

    "panel.explain": "Explanation",
    "panel.explainConnection": "Connection guide",
    "panel.expand": "What each new concept means",
    "panel.close": "Close",
    "panel.connectionLoading": "Building the connection guide...",
    "panel.connectionEmpty": "No connection guide for this node yet.",
    "panel.connectionOverview": "In one sentence",
    "panel.connectionSteps": "How they connect",
    "panel.connectionWhy": "Why it matters",
    "panel.connectionExample": "Example",
    "panel.connectionTakeaway": "Key takeaway",
    "panel.expandCached": "Shown from memory. Expand for more.",
    "expand.empty": "No new concepts were added.",
    "panel.connectionCached": "Saved to this map. Generate again for a fresh explanation.",
    "panel.regenerate": "Generate again",

    "connection.root":
      "This is the starting point of the map. Nothing precedes it, so there is no earlier idea to connect it to yet. Expand this node to build the branch that explains what it leads to.",

    "create.title": "Create a mind map",
    "create.subtitle":
      "Upload a lecture slide, PDF, or notes. Mindboard turns it into a map you can walk through.",
    "create.languageHint": "Used for the map's content. You can change it later.",
    "create.generate": "Generate mind map",
    "create.generating": "Building your map...",
    "create.file.drop": "Drop a file here",
    "create.file.choose": "or click to browse",
    "create.file.formats": "PDF, PPT, PPTX, DOCX, DOC, or TXT · up to 25 MB",
    "create.file.remove": "Remove",
    "create.paste": "Or paste your notes",
    "create.paste.placeholder": "Paste lecture notes or a transcript here...",
    "create.errorTooLarge": "That file is too large. Please choose one under 25 MB.",
    "create.errorFormat": "That file type is not supported yet.",
    "create.errorSignIn": "Your session expired. Please sign in again.",
    "create.errorUpload": "We could not read that file. Try a different one.",
    "create.errorEmpty": "Add a file or paste some notes first.",
    "create.errorGeneric": "Something went wrong on our side. Please try again.",
    "create.errorSlow": "That took longer than expected. Please try again.",
    "create.errorNetwork": "We could not reach the server. Check your connection.",

    "lang.dashboardSelector": "Interface language",
    "lang.mapSelector": "Map content language",
    "lang.changing": "Changing language...",
    "lang.changed": "Map language changed",
    "lang.failed":
      "Language change could not be completed. Your current map is still safe.",

    "stage.understanding": "Understanding your source",
    "stage.structuring": "Structuring the main ideas",
    "stage.connecting": "Connecting related concepts",
    "stage.completing": "Finishing touches",

    "notify.expanded": "Expanded successfully",
    "notify.expandFailed": "Could not expand this node.",
    "notify.explainConnectionFailed": "Could not build the connection guide.",
    "notify.explainFailed": "Could not explain this node.",

    "error.session.title": "Your session has expired.",
    "error.session.tip": "Please sign in again to continue.",
    "error.busy.title": "Our AI service is busy right now.",
    "error.busy.tip1": "Give it a moment, then try again.",
    "error.busy.tip2": "If it keeps happening, try again in a few minutes.",
    "error.scanned.title": "We could not find readable text in this file.",
    "error.scanned.tip1": "Scanned slides without selectable text cannot be read.",
    "error.scanned.tip2": "Try the original export, or paste the notes instead.",
    "error.slow.title": "That took longer than expected.",
    "error.slow.tip1": "Try again, or use a smaller file.",
    "error.slow.tip2": "Large decks can take a couple of minutes.",
    "error.large.title": "That file is too large.",
    "error.large.tip1": "Please choose one under 25 MB.",
    "error.large.tip2": "Splitting the file into parts usually works.",
    "error.network.title": "We could not reach the server.",
    "error.network.tip1": "Check your connection, then try again.",
    "error.server.title": "Something went wrong on our side.",
    "error.server.tip1": "This is on us, not you.",
    "error.server.tip2": "Please try again in a moment.",
    "error.input.title": "We could not read this input.",
    "error.input.tip1": "Add a file or paste some notes, then try again.",
    "error.input.tip2": "Supported files: PDF, PPT, PPTX, DOCX, DOC, TXT.",
    "error.generic.title": "Something went wrong.",
    "error.generic.tip1": "Please try again.",
    "error.generic.tip2": "If it keeps happening, something needs fixing on our end.",
    "error.retry": "Try again",
  },

  id: {
    "nav.backToDashboard": "Dasbor",

    "dashboard.greeting.morning": "Selamat pagi",
    "dashboard.greeting.afternoon": "Selamat siang",
    "dashboard.greeting.evening": "Selamat malam",
    "dashboard.tagline": "Buat peta pikiran. Lihat bagaimana semuanya terhubung.",
    "dashboard.create": "Buat peta baru",
    "dashboard.section": "Peta pikiran Anda",
    "dashboard.counts": "{maps} peta · {konsep} konsep",
    "dashboard.empty.title": "Peta pertama Anda tinggal satu perintah lagi.",
    "dashboard.empty.body":
      "Unggah slide kuliah, PDF, atau catatan dan dapatkan peta pikiran terstruktur yang bisa Anda telusuri dan perluas.",
    "dashboard.empty.cta": "Buat peta pertama Anda",

    "map.concepts": "{n} konsep",
    "map.concept": "1 konsep",
    "map.open": "Buka peta",
    "map.lastEdited": "Diubah {date}",

    "board.save": "Simpan",
    "board.saving": "Menyimpan...",
    "board.saved": "Tersimpan",
    "board.unsaved": "Perubahan belum disimpan",
    "board.delete": "Hapus",
    "board.deleteConfirm": "Hapus peta ini beserta seluruh node-nya?",
    "board.deleteCancel": "Batal",
    "board.deleteConfirmAction": "Hapus",
    "board.deleting": "Menghapus...",
    "board.deleteFailed": "Peta tidak dapat dihapus.",
    "board.saveFailed": "Peta tidak dapat disimpan.",

    "node.explain": "Jelaskan",
    "node.explainConnection": "Jelaskan hubungan",
    "node.expand": "Perluas",

    "panel.explain": "Penjelasan",
    "panel.explainConnection": "Panduan hubungan",
    "panel.expand": "Arti tiap konsep baru",
    "panel.close": "Tutup",
    "panel.connectionLoading": "Menyusun panduan hubungan...",
    "panel.connectionEmpty": "Belum ada panduan hubungan untuk node ini.",
    "panel.connectionOverview": "Dalam satu kalimat",
    "panel.connectionSteps": "Cara keduanya terhubung",
    "panel.connectionWhy": "Mengapa ini penting",
    "panel.connectionExample": "Contoh",
    "panel.connectionTakeaway": "Poin utama",
    "panel.expandCached": "Ditampilkan dari memori. Perluas untuk detail.",
    "expand.empty": "Tidak ada konsep baru yang ditambahkan.",
    "panel.connectionCached": "Tersimpan di peta ini. Generate lagi untuk penjelasan baru.",
    "panel.regenerate": "Generate lagi",

    "connection.root":
      "Ini adalah titik awal peta. Tidak ada ide sebelumnya yang bisa disambungkan, jadi belum ada hubungan untuk ditampilkan. Perluas node ini untuk membangun cabang yang menjelaskan ke mana ide ini berkembang.",

    "create.title": "Buat peta pikiran",
    "create.subtitle":
      "Unggah slide kuliah, PDF, atau catatan. Mindboard mengubahnya menjadi peta yang bisa Anda telusuri.",
    "create.languageHint": "Dipakai untuk isi peta. Bisa diubah nanti.",
    "create.generate": "Buat peta pikiran",
    "create.generating": "Sedang membuat peta...",
    "create.file.drop": "Letakkan berkas di sini",
    "create.file.choose": "atau klik untuk memilih",
    "create.file.formats": "PDF, PPT, PPTX, DOCX, DOC, atau TXT · maks. 25 MB",
    "create.file.remove": "Hapus",
    "create.paste": "Atau tempel catatan Anda",
    "create.paste.placeholder": "Tempel catatan kuliah atau transkrip di sini...",
    "create.errorTooLarge": "Berkas terlalu besar. Pilih yang di bawah 25 MB.",
    "create.errorFormat": "Jenis berkas ini belum didukung.",
    "create.errorSignIn": "Sesi Anda berakhir. Silakan masuk kembali.",
    "create.errorUpload": "Berkas tidak dapat dibaca. Coba berkas lain.",
    "create.errorEmpty": "Tambahkan berkas atau tempel catatan terlebih dahulu.",
    "create.errorGeneric": "Terjadi masalah di sisi kami. Silakan coba lagi.",
    "create.errorSlow": "Prosesnya lebih lama dari perkiraan. Silakan coba lagi.",
    "create.errorNetwork": "Server tidak dapat dihubungi. Periksa koneksi Anda.",

    "lang.dashboardSelector": "Bahasa antarmuka",
    "lang.mapSelector": "Bahasa isi peta",
    "lang.changing": "Mengubah bahasa...",
    "lang.changed": "Bahasa peta berhasil diubah",
    "lang.failed":
      "Perubahan bahasa belum berhasil. Peta Anda tetap aman seperti sebelumnya.",

    "stage.understanding": "Memahami sumber Anda",
    "stage.structuring": "Menyusun ide utama",
    "stage.connecting": "Menghubungkan konsep terkait",
    "stage.completing": "Menyempurnakan hasil",

    "notify.expanded": "Berhasil diperluas",
    "notify.expandFailed": "Node ini tidak dapat diperluas.",
    "notify.explainConnectionFailed": "Panduan hubungan tidak dapat dibuat.",
    "notify.explainFailed": "Node ini tidak dapat dijelaskan.",

    "error.session.title": "Sesi Anda telah berakhir.",
    "error.session.tip": "Silakan masuk kembali untuk melanjutkan.",
    "error.busy.title": "Layanan AI kami sedang sibuk.",
    "error.busy.tip1": "Tunggu sebentar, lalu coba lagi.",
    "error.busy.tip2": "Kalau terus terjadi, coba lagi beberapa menit lagi.",
    "error.scanned.title": "Tidak ditemukan teks yang bisa dibaca di berkas ini.",
    "error.scanned.tip1": "Slide hasil pindai tanpa teks yang bisa dipilih tidak dapat dibaca.",
    "error.scanned.tip2": "Coba berkas hasil ekspor aslinya, atau tempel catatannya.",
    "error.slow.title": "Prosesnya lebih lama dari perkiraan.",
    "error.slow.tip1": "Coba lagi, atau gunakan berkas yang lebih kecil.",
    "error.slow.tip2": "Deck besar bisa memakan waktu beberapa menit.",
    "error.large.title": "Berkas terlalu besar.",
    "error.large.tip1": "Silakan pilih berkas di bawah 25 MB.",
    "error.large.tip2": "Membagi berkas menjadi beberapa bagian biasanya berhasil.",
    "error.network.title": "Server tidak dapat dihubungi.",
    "error.network.tip1": "Periksa koneksi Anda, lalu coba lagi.",
    "error.server.title": "Terjadi masalah di sisi kami.",
    "error.server.tip1": "Ini pihak kami, bukan Anda.",
    "error.server.tip2": "Silakan coba lagi sebentar lagi.",
    "error.input.title": "Masukan ini tidak dapat dibaca.",
    "error.input.tip1": "Tambahkan berkas atau tempel catatan, lalu coba lagi.",
    "error.input.tip2": "Berkas yang didukung: PDF, PPT, PPTX, DOCX, DOC, TXT.",
    "error.generic.title": "Terjadi kesalahan.",
    "error.generic.tip1": "Silakan coba lagi.",
    "error.generic.tip2": "Kalau terus terjadi, ada yang perlu diperbaiki di sisi kami.",
    "error.retry": "Coba lagi",
  },
} as const satisfies Record<AppLanguage, Record<string, string | readonly string[]>>;

export const LANGUAGE_LABELS: Record<AppLanguage, { native: string; short: string }> =
  {
    en: { native: "English", short: "EN" },
    id: { native: "Bahasa Indonesia", short: "ID" },
  };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

function toTemplate(value: string | readonly string[], count?: number): string {
  if (typeof value === "string") return value;
  if (count === undefined) return value.join(" ");
  const index = Math.min(Math.max(count - 1, 0), value.length - 1);
  return value[index];
}

type TranslateVars = Record<string, string | number> & { count?: number };

export function translate(
  language: AppLanguage,
  key: MessageKey,
  vars?: TranslateVars
): string {
  const template = toTemplate(MESSAGES[language][key], vars?.count);
  return interpolate(template, vars);
}

export function translateList(
  language: AppLanguage,
  key: MessageKey,
  vars?: Record<string, string | number>
): string[] {
  const value = MESSAGES[language][key];
  const list = typeof value === "string" ? [value] : value;
  return list.map((entry) => interpolate(entry, vars));
}

/* ------------------------------------------------------------------ *
 * React binding
 * ------------------------------------------------------------------ */

const I18nContext = createContext<{
  language: AppLanguage;
  t: (key: MessageKey, vars?: TranslateVars) => string;
  tList: (key: MessageKey, vars?: Record<string, string | number>) => string[];
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { language } = useUiLanguage();

  const t = useCallback(
    (key: MessageKey, vars?: TranslateVars) => translate(language, key, vars),
    [language]
  );
  const tList = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translateList(language, key, vars),
    [language]
  );

  const value = useMemo(() => ({ language, t, tList }), [language, t, tList]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  const { language } = useUiLanguage();

  const t = context?.t ?? ((key: MessageKey, vars?: TranslateVars) => translate(language, key, vars));
  const tList =
    context?.tList ??
    ((key: MessageKey, vars?: Record<string, string | number>) =>
      translateList(language, key, vars));

  return { language: context?.language ?? language, t, tList };
}

/** Formats a date in the interface language without pulling in a locale bundle. */
export function formatDate(
  language: AppLanguage,
  value: string | number | Date | null | undefined
): string {
  if (value === null || value === undefined) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}