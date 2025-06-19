"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { MdDelete, MdAdd } from "react-icons/md"
import type { UserRole } from "@/types/user-role"
import { addUserWithFullAccess, removeUserAccess, checkEmailExists } from "@/lib/role-service"
import { useAuth } from "@/components/auth-provider"
import { Select } from "@/components/ui/select"

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
]

export function UserRoleTable({ initialUsers }: UserRoleTableProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRole[]>(initialUsers)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserTabs, setNewUserTabs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

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

      const success = await addUserWithFullAccess(tempUid, newUserEmail, user?.email || "admin", newUserTabs)

      if (success) {
        const newUser: UserRole = {
          uid: tempUid,
          email: newUserEmail,
          fullAccess: true,
          addedBy: user?.email || "admin",
          addedAt: Date.now(),
          allowedTabs: newUserTabs,
        }

        setUsers([...users, newUser])
        setNewUserEmail("")
        setNewUserTabs([])

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
    setUsers(users.map(u => u.uid === uid ? { ...u, allowedTabs } : u))
    setUpdatingUser(uid)
    
    try {
      const userEmail = users.find(u => u.uid === uid)?.email || uid
      await addUserWithFullAccess(uid, userEmail, user?.email || "admin", allowedTabs)
      
      toast({ 
        title: "Succes",
        description: "Permisiunile au fost actualizate"
      })
    } catch (error) {
      const originalUser = users.find(u => u.uid === uid)
      if (originalUser) {
        setUsers(users.map(u => u.uid === uid ? originalUser : u))
      }
      
      toast({ 
        title: "Eroare", 
        description: "Nu s-au putut actualiza permisiunile",
        variant: "destructive" 
      })
    } finally {
      setUpdatingUser(null)
    }
  }

  return (
    <div className="space-y-4">
      {user?.email === "radu.p1995@yahoo.com" && (
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
          
          <div className="flex-2">
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
              {user?.email === "radu.p1995@yahoo.com" && <TableHead className="w-[100px]">Acțiuni</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user?.email === "radu.p1995@yahoo.com" ? 5 : 4} className="text-center py-4 text-muted-foreground">
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
                    {user?.email === "radu.p1995@yahoo.com" ? (
                      <div className="grid grid-cols-2 gap-2 max-w-md">
                        {ALL_TABS.map(tab => (
                          <label key={tab.value} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={u.allowedTabs ? u.allowedTabs.includes(tab.value) : false}
                              onChange={e => {
                                const currentTabs = u.allowedTabs || []
                                let newTabs: string[]
                                
                                if (e.target.checked) {
                                  newTabs = [...currentTabs, tab.value]
                                } else {
                                  newTabs = currentTabs.filter(t => t !== tab.value)
                                }
                                
                                handleTabsChange(u.uid, newTabs)
                              }}
                              disabled={updatingUser === u.uid}
                              className="rounded"
                            />
                            <span className={updatingUser === u.uid ? "opacity-50" : ""}>
                              {tab.label}
                            </span>
                          </label>
                        ))}
                      </div>
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
                  {user?.email === "radu.p1995@yahoo.com" && (
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
    </div>
  )
}
