import { redirect } from "next/navigation"

/** Ruta veche păstrată pentru bookmark-uri; conținutul e acum sub /adr */
export default function Adr70RedirectPage() {
  redirect("/adr")
}
