/** @jest-environment node */

import { execFile } from "child_process"
import { readFile, mkdtemp, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { promisify } from "util"
import { PDFDocument } from "pdf-lib"
import {
  POST,
  validateIrpPayload,
} from "@/app/api/irp/proces-verbal/route"
import {
  IRP_PDF_CANONICAL_TEXT,
  IRP_PDF_PAGE_SIZE,
  createIrpPdf,
} from "@/lib/irp-pdf/generator"
import {
  IRP_DEFAULT_INSPECTORAT,
  IRP_TEXT_LIMITS,
  isValidIrpDate,
  type IrpGeneratePayload,
} from "@/shared/irp"

jest.setTimeout(30_000)

const execFileAsync = promisify(execFile)

const completePayload: IrpGeneratePayload = {
  common: {
    inspectorat: "ISU Dâmbovița",
    subunitate: "Detașamentul de Pompieri Târgoviște",
    pvNumber: "123/2026",
    pvDate: "2026-07-25",
    localitate: "Târgoviște",
    locInterventie: "locuință de pe Calea București",
    judet: "Dâmbovița",
    strada: "Calea București",
    numar: "10",
    eventType: "incendiu",
    producedAt: "ora 14:30",
    eventDetails: "Intervenție desfășurată în condiții de vizibilitate redusă.",
    owner: "Ion Popescu",
    situation: "Incendiul se manifesta la nivelul acoperișului.",
    consequences: "Au fost afectate elemente de tâmplărie și învelitoarea.",
    adultVictims: "0",
    childVictims: "0",
    animals: "0",
    rescued: "două persoane și un animal",
    affectedOwnersCount: "1",
    conditiiFavorizante: "vânt puternic",
    sediuIsu: "Târgoviște, str. I.E. Florescu nr. 1",
  },
  cause: {
    locFocar: { label: "Acoperiș", code: "12" },
    sursaProbabila: { label: "Scurtcircuit electric", code: "3" },
    mijlocAprindere: { label: "Conductor electric", code: "8" },
    primulMaterial: { label: "Material lemnos", code: "4" },
    imprejurareDeterminanta: { label: "Conductor defect", code: "2" },
  },
  damage: {
    affectedProperty: "Ion Popescu, locuință",
    affectedLocality: "Târgoviște",
    affectedCounty: "Dâmbovița",
    affectedStreet: "Calea București",
    affectedNumber: "10",
    damageDescription: "Acoperiș afectat pe aproximativ 20 mp.",
  },
}

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function modernRomanianDiacritics(value: string) {
  return value
    .replaceAll("Ş", "Ș")
    .replaceAll("ş", "ș")
    .replaceAll("Ţ", "Ț")
    .replaceAll("ţ", "ț")
}

function longestRepeatedCharacter(value: string, character: string) {
  return Math.max(
    0,
    ...(value.match(new RegExp(`(?:${character}\\s*)+`, "g")) ?? []).map(
      (sequence) => sequence.match(new RegExp(character, "g"))?.length ?? 0,
    ),
  )
}

async function extractPageText(bytes: Uint8Array) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "irp-pdf-test-"))
  const pdfPath = path.join(temporaryDirectory, "document.pdf")
  try {
    await writeFile(pdfPath, bytes)
    const { stdout } = await execFileAsync(process.execPath, [
      path.join(process.cwd(), "scripts", "extract-pdf-text.mjs"),
      pdfPath,
    ])
    return (JSON.parse(stdout) as string[]).map(normalized)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

describe("IRP PDF generator", () => {
  it("draws exactly Anexa 19 and Anexa 20 on two new A4 pages", async () => {
    const bytes = await createIrpPdf(completePayload)
    const pdf = await PDFDocument.load(bytes)
    const rawPdf = Buffer.from(bytes).toString("latin1")

    expect(bytes.length).toBeGreaterThan(10_000)
    expect(pdf.getPageCount()).toBe(2)
    pdf.getPages().forEach((page) => {
      expect(page.getWidth()).toBeCloseTo(IRP_PDF_PAGE_SIZE[0], 1)
      expect(page.getHeight()).toBeCloseTo(IRP_PDF_PAGE_SIZE[1], 1)
    })
    expect(rawPdf).not.toContain("/Subtype /Image")

    if (process.env.IRP_TEST_OUTPUT) {
      await writeFile(process.env.IRP_TEST_OUTPUT, bytes)
    }
  })

  it("embeds canonical and dynamic Romanian text in the expected page", async () => {
    const pages = await extractPageText(await createIrpPdf(completePayload))

    expect(pages[0]).toContain(IRP_DEFAULT_INSPECTORAT)
    expect(pages[0]).toContain(IRP_PDF_CANONICAL_TEXT.anexa19Title)
    expect(pages[0]).toContain(IRP_PDF_CANONICAL_TEXT.situation)
    expect(pages[0]).toContain("Acoperiș (12)")
    expect(pages[0]).toContain("două persoane și un animal")
    expect(pages[0]).toContain("cu 1 anexe")

    expect(pages[1]).toContain(IRP_PDF_CANONICAL_TEXT.anexa20Title)
    expect(pages[1]).toContain("Anexa nr. 1 la Procesul-verbal de intervenție")
    expect(pages[1]).toContain("Acoperiș afectat pe aproximativ 20 mp.")
    expect(pages[1]).toContain("Ion Popescu, locuință")
  })

  it("uses common data as the Anexa 20 fallback", async () => {
    const bytes = await createIrpPdf({
      common: {
        subunitate: "Garda Vișina",
        pvNumber: "7",
        pvDate: "2026-07-25",
        owner: "Proprietar implicit",
        localitate: "Vișina",
        judet: "Dâmbovița",
        consequences: "Descriere comună a pagubelor.",
      },
    })
    const pages = await extractPageText(bytes)

    expect(pages[1]).toContain("Proprietar implicit")
    expect(pages[1]).toContain("Vișina")
    expect(pages[1]).toContain("Descriere comună a pagubelor.")
  })

  it("does not import, copy or embed either official model PDF", async () => {
    const source = await readFile(
      path.join(process.cwd(), "lib", "irp-pdf", "generator.ts"),
      "utf8",
    )

    expect(source).not.toMatch(/portal irp/i)
    expect(source).not.toMatch(/PDFDocument\.load|copyPages|embedPage/)
    expect(source).not.toMatch(/\.pdf["']/i)
  })

  it("keeps the canonical section copy present in the official models", async () => {
    const modelDirectory = path.join(process.cwd(), "public", "portal irp")
    const [anexa19] = await extractPageText(
      new Uint8Array(
        await readFile(path.join(modelDirectory, "Anexa 19 Proces verbal de intervenție.pdf")),
      ),
    )
    const [anexa20] = await extractPageText(
      new Uint8Array(
        await readFile(path.join(modelDirectory, "Anexa 20 Anexa la Proces verbal de intervenție.pdf")),
      ),
    )

    expect(modernRomanianDiacritics(anexa19)).toContain(IRP_PDF_CANONICAL_TEXT.situation)
    expect(modernRomanianDiacritics(anexa19)).toContain(IRP_PDF_CANONICAL_TEXT.consequences)
    expect(modernRomanianDiacritics(anexa19)).toContain(IRP_PDF_CANONICAL_TEXT.cause)
    expect(modernRomanianDiacritics(anexa20)).toContain(IRP_PDF_CANONICAL_TEXT.anexa20Title)
    expect(modernRomanianDiacritics(anexa20)).toContain(
      "În urma evenimentului a fost afectată proprietatea",
    )
  })

  it("keeps text at the accepted limits inside the available ruled areas", async () => {
    const pages = await extractPageText(
      await createIrpPdf({
        common: {
          subunitate: "Garda Vișina",
          pvNumber: "limită",
          pvDate: "2026-07-25",
          situation: "W".repeat(IRP_TEXT_LIMITS.situation),
          consequences: "M".repeat(IRP_TEXT_LIMITS.consequences),
          rescued: "X".repeat(IRP_TEXT_LIMITS.rescued),
        },
        damage: {
          damageDescription: "Z".repeat(IRP_TEXT_LIMITS.damageDescription),
        },
      }),
    )

    expect(longestRepeatedCharacter(pages[0], "W")).toBe(IRP_TEXT_LIMITS.situation)
    expect(longestRepeatedCharacter(pages[0], "M")).toBe(IRP_TEXT_LIMITS.consequences)
    expect(longestRepeatedCharacter(pages[0], "X")).toBe(IRP_TEXT_LIMITS.rescued)
    expect(longestRepeatedCharacter(pages[1], "Z")).toBe(IRP_TEXT_LIMITS.damageDescription)
    expect(pages.join(" ")).not.toContain("…")
  })

  it("returns a PDF from the existing POST contract", async () => {
    const response = await POST({
      json: async () => completePayload,
    } as Request)
    const bytes = new Uint8Array(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/pdf")
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
  })

  it("rejects invalid dates, non-text fields and fields over the PDF limits", () => {
    expect(
      validateIrpPayload({
        common: { subunitate: "Garda Vișina", pvNumber: "7", pvDate: "2026-02-30" },
      }),
    ).toContain("Data procesului-verbal")

    expect(
      validateIrpPayload({
        common: {
          subunitate: "Garda Vișina",
          pvNumber: "7",
          pvDate: "2026-07-25",
          situation: "x".repeat(IRP_TEXT_LIMITS.situation + 1),
        },
      }),
    ).toContain(`maximum ${IRP_TEXT_LIMITS.situation}`)

    expect(
      validateIrpPayload({
        common: {
          subunitate: "Garda Vișina",
          pvNumber: "7",
          pvDate: "2026-07-25",
          owner: 42,
        },
      }),
    ).toContain("common.owner")
  })

  it("keeps the inspectorate editable in web while precompleting the official value", async () => {
    const html = await readFile(
      path.join(process.cwd(), "public", "indrumator", "index.html"),
      "utf8",
    )

    expect(html).toContain(
      'value="Inspectoratul pentru Situații de Urgență &quot;Basarab I&quot; al județului Dâmbovița"',
    )
    expect(html).toContain("LEGACY_DEFAULT_INSPECTORATE")
  })

  it("validates real ISO calendar dates", () => {
    expect(isValidIrpDate("2026-07-25")).toBe(true)
    expect(isValidIrpDate("2026-02-30")).toBe(false)
    expect(isValidIrpDate("25.07.2026")).toBe(false)
  })
})
