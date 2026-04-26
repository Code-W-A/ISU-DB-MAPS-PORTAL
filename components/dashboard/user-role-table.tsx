"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { MdDelete, MdAdd } from "react-icons/md"
import type { UserRole } from "@/types/user-role"
import type { PreventionZonesAccessLevel } from "@/types/prevention-zone"
import { addUserWithFullAccess, removeUserAccess, checkEmailExists, mergeUserRoleFields } from "@/lib/role-service"
import { useAuth } from "@/components/auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMobile } from "@/hooks/use-mobile"

interface UserRoleTableProps {
  initialUsers: UserRole[]
}

const ALL_TABS = [
  { value: "users", label: "Utilizatori" },
  { value: "hydrants", label: "Hidranți" },
  { value: "reports", label: "Semnalări" },
  { value: "primarii", label: "Primării" },
  { value: "seveso", label: "SEVESO" },
  { value: "data", label: "Import Date" },
  { value: "settings", label: "Setări" },
  { value: "legislatie", label: "Legislație" },
  { value: "preventionZones", label: "Zone competență" },
  { value: "indrumator", label: "Îndrumător (hartă)" },
  { value: "adr", label: "ADR / Substanțe periculoase" },
]

const PREVENTION_ACCESS_OPTIONS: { value: PreventionZonesAccessLevel; label: string }[] = [
  { value: "none", label: "Fără acces" },
  { value: "read", label: "Doar citire (hartă + căutare)" },
  { value: "write", label: "Citire + editare zone" },
]

export function UserRoleTable({ initialUsers }: UserRoleTableProps) {
  const { user } = useAuth()
  const { isMobile } = useMobile()
  const [users, setUsers] = useState<UserRole[]>(initialUsers)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserTabs, setNewUserTabs] = useState<string[]>([])
  const [newUserPreventionAccess, setNewUserPreventionAccess] = useState<PreventionZonesAccessLevel>("none")
  const [isLoading, setIsLoading] = useState(false)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [openTabsForUid, setOpenTabsForUid] = useState<string | null>(null)
  const [openZonesForUid, setOpenZonesForUid] = useState<string | null>(null)

  const isTableAdmin = user?.email === "radu.p1995@yahoo.com"

  useEffect(() => {
    if (!isMobile) {
      setOpenTabsForUid(null)
      setOpenZonesForUid(null)
    }
  }, [isMobile])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUserEmail || !newUserEmail.includes("@")) {
      toast({
        title: "Eroare",
        description: "Introduceți o adresă de email validă",
        variant: "destructive",
      })
      return
    }

    if (newUserTabs.length === 0) {
      toast({
        title: "Eroare", 
        description: "Selectați cel puțin un tab pentru utilizator",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const exists = await checkEmailExists(newUserEmail)
      if (exists) {
        toast({
          title: "Eroare",
          description: "Acest email există deja în listă",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const tempUid = newUserEmail

      const success = await addUserWithFullAccess(
        tempUid,
        newUserEmail,
        user?.email || "admin",
        newUserTabs,
        newUserPreventionAccess,
      )

      if (success) {
        const newUser: UserRole = {
          uid: tempUid,
          email: newUserEmail,
          fullAccess: true,
          addedBy: user?.email || "admin",
          addedAt: Date.now(),
          allowedTabs: newUserTabs,
          preventionZonesAccess: newUserPreventionAccess,
        }

        setUsers([...users, newUser])
        setNewUserEmail("")
        setNewUserTabs([])
        setNewUserPreventionAccess("none")

        toast({
          title: "Succes",
          description: "Utilizatorul a fost adăugat cu succes",
        })
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-a putut adăuga utilizatorul",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: "Eroare",
        description: "A apărut o eroare la adăugarea utilizatorului",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  const handleRemoveUser = async (uid: string) => {
    setIsLoading(true)

    try {
      const success = await removeUserAccess(uid)

      if (success) {
        setUsers(users.filter((user) => user.uid !== uid))

        toast({
          title: "Succes",
          description: "Utilizatorul a fost eliminat cu succes",
        })
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-a putut elimina utilizatorul",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing user:", error)
      toast({
        title: "Eroare",
        description: "A apărut o eroare la eliminarea utilizatorului",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  const handleTabsChange = async (uid: string, allowedTabs: string[]) => {
    setUsers(users.map((u) => (u.uid === uid ? { ...u, allowedTabs } : u)))
    setUpdatingUser(uid)

    try {
      const ok = await mergeUserRoleFields(uid, { allowedTabs })
      if (ok) {
        toast({
          title: "Succes",
          description: "Permisiunile au fost actualizate",
        })
      } else {
        throw new Error("merge failed")
      }
    } catch {
      const originalUser = users.find((u) => u.uid === uid)
      if (originalUser) {
        setUsers(users.map((u) => (u.uid === uid ? originalUser : u)))
      }

      toast({
        title: "Eroare",
        description: "Nu s-au putut actualiza permisiunile",
        variant: "destructive",
      })
    } finally {
      setUpdatingUser(null)
    }
  }

  const handlePreventionAccessChange = async (uid: string, preventionZonesAccess: PreventionZonesAccessLevel) => {
    const prev = users.find((u) => u.uid === uid)
    setUsers(users.map((u) => (u.uid === uid ? { ...u, preventionZonesAccess } : u)))
    setUpdatingUser(uid)
    try {
      const ok = await mergeUserRoleFields(uid, { preventionZonesAccess })
      if (ok) {
        toast({ title: "Succes", description: "Acces zone competență actualizat" })
      } else {
        throw new Error("merge failed")
      }
    } catch {
      if (prev) setUsers(users.map((u) => (u.uid === uid ? prev : u)))
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza accesul la zone",
        variant: "destructive",
      })
    } finally {
      setUpdatingUser(null)
    }
  }

  return (
    <div className="space-y-4">
      {isTableAdmin && (
        <form onSubmit={handleAddUser} className="flex flex-col md:flex-row items-start gap-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex-1">
        <Input
          type="email"
          placeholder="Adaugă email utilizator"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
          disabled={isLoading}
        />
          </div>
          
          <div className="flex-2 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Zone competență (prevenție):</p>
              <Select
                value={newUserPreventionAccess}
                onValueChange={(v) => setNewUserPreventionAccess(v as PreventionZonesAccessLevel)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Acces" />
                </SelectTrigger>
                <SelectContent>
                  {PREVENTION_ACCESS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm font-medium mb-2">Selectează taburile permise:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_TABS.map(tab => (
                <label key={tab.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserTabs.includes(tab.value)}
                    onChange={e => {
                      if (e.target.checked) {
                        setNewUserTabs([...newUserTabs, tab.value])
                      } else {
                        setNewUserTabs(newUserTabs.filter(t => t !== tab.value))
                      }
                    }}
                    disabled={isLoading}
                    className="rounded"
                  />
                  {tab.label}
                </label>
              ))}
            </div>
          </div>
          
          <Button type="submit" disabled={isLoading || newUserTabs.length === 0}>
          <MdAdd className="mr-2" /> Adaugă
        </Button>
      </form>
      )}

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Adăugat de</TableHead>
              <TableHead>Data adăugării</TableHead>
              <TableHead>Taburi permise</TableHead>
              <TableHead className="min-w-[200px]">Zone competență</TableHead>
              {isTableAdmin && <TableHead className="w-[100px]">Acțiuni</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isTableAdmin ? 6 : 5} className="text-center py-4 text-muted-foreground">
                  Nu există utilizatori cu acces la dashboard
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="text-sm text-gray-600">{u.addedBy}</TableCell>
                  <TableCell className="text-sm text-gray-600">{new Date(u.addedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {isTableAdmin ? (
                      <>
                        <div className="hidden grid-cols-2 gap-2 max-w-md md:grid">
                          {ALL_TABS.map((tab) => (
                            <label key={tab.value} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={u.allowedTabs ? u.allowedTabs.includes(tab.value) : false}
                                onChange={(e) => {
                                  const currentTabs = u.allowedTabs || []
                                  let newTabs: string[]

                                  if (e.target.checked) {
                                    newTabs = [...currentTabs, tab.value]
                                  } else {
                                    newTabs = currentTabs.filter((t) => t !== tab.value)
                                  }

                                  void handleTabsChange(u.uid, newTabs)
                                }}
                                disabled={updatingUser === u.uid}
                                className="rounded"
                              />
                              <span className={updatingUser === u.uid ? "opacity-50" : ""}>{tab.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="space-y-2 min-w-0 md:hidden">
                          <p className="text-xs text-muted-foreground">
                            {(u.allowedTabs || []).length === 0
                              ? "Niciun tab"
                              : `${(u.allowedTabs || []).length} taburi selectate`}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setOpenTabsForUid(u.uid)}
                            disabled={updatingUser === u.uid}
                          >
                            Editează taburi
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(u.allowedTabs || []).length > 0 ? (
                          u.allowedTabs?.map(tab => (
                            <span key={tab} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {ALL_TABS.find(t => t.value === tab)?.label || tab}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Niciun tab permis</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isTableAdmin ? (
                      <>
                        <div className="hidden md:block">
                          <Select
                            value={u.preventionZonesAccess ?? "none"}
                            onValueChange={(v) => void handlePreventionAccessChange(u.uid, v as PreventionZonesAccessLevel)}
                            disabled={updatingUser === u.uid}
                          >
                            <SelectTrigger className="h-9 w-[min(100%,220px)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PREVENTION_ACCESS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 min-w-0 md:hidden">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {PREVENTION_ACCESS_OPTIONS.find((o) => o.value === (u.preventionZonesAccess ?? "none"))?.label ??
                              "Fără acces"}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setOpenZonesForUid(u.uid)}
                            disabled={updatingUser === u.uid}
                          >
                            Setează acces
                          </Button>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {PREVENTION_ACCESS_OPTIONS.find((o) => o.value === (u.preventionZonesAccess ?? "none"))?.label ??
                          "Fără acces"}
                      </span>
                    )}
                  </TableCell>
                  {isTableAdmin && (
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveUser(u.uid)} 
                        disabled={isLoading || updatingUser === u.uid}
                      >
                      <MdDelete className="text-red-500" />
                    </Button>
                  </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isTableAdmin && (
        <>
          <Dialog
            open={openTabsForUid !== null}
            onOpenChange={(open) => {
              if (!open) setOpenTabsForUid(null)
            }}
          >
            <DialogContent className="max-w-md">
              {openTabsForUid
                ? (() => {
                    const tabUser = users.find((x) => x.uid === openTabsForUid)
                    if (!tabUser) return null
                    return (
                      <>
                        <DialogHeader>
                          <DialogTitle>Taburi permise</DialogTitle>
                          <DialogDescription className="break-all">{tabUser.email}</DialogDescription>
                        </DialogHeader>
                        <div className="grid max-h-[min(60vh,420px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                          {ALL_TABS.map((tab) => (
                            <label key={tab.value} className="flex min-h-[44px] items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tabUser.allowedTabs ? tabUser.allowedTabs.includes(tab.value) : false}
                                onChange={(e) => {
                                  const currentTabs = tabUser.allowedTabs || []
                                  const newTabs = e.target.checked
                                    ? [...currentTabs, tab.value]
                                    : currentTabs.filter((t) => t !== tab.value)
                                  void handleTabsChange(tabUser.uid, newTabs)
                                }}
                                disabled={updatingUser === tabUser.uid}
                                className="rounded"
                              />
                              <span className={updatingUser === tabUser.uid ? "opacity-50" : ""}>{tab.label}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )
                  })()
                : null}
            </DialogContent>
          </Dialog>

          <Dialog
            open={openZonesForUid !== null}
            onOpenChange={(open) => {
              if (!open) setOpenZonesForUid(null)
            }}
          >
            <DialogContent className="max-w-md">
              {openZonesForUid
                ? (() => {
                    const zoneUser = users.find((x) => x.uid === openZonesForUid)
                    if (!zoneUser) return null
                    return (
                      <>
                        <DialogHeader>
                          <DialogTitle>Zone competență</DialogTitle>
                          <DialogDescription className="break-all">{zoneUser.email}</DialogDescription>
                        </DialogHeader>
                        <Select
                          value={zoneUser.preventionZonesAccess ?? "none"}
                          onValueChange={(v) => {
                            const level = v as PreventionZonesAccessLevel
                            setOpenZonesForUid(null)
                            void handlePreventionAccessChange(zoneUser.uid, level)
                          }}
                          disabled={updatingUser === zoneUser.uid}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PREVENTION_ACCESS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )
                  })()
                : null}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
