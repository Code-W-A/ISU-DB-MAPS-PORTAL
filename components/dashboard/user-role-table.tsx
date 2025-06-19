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

interface UserRoleTableProps {
  initialUsers: UserRole[]
}

export function UserRoleTable({ initialUsers }: UserRoleTableProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRole[]>(initialUsers)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Modificăm funcția handleAddUser pentru a folosi emailul ca identificator
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

    setIsLoading(true)

    try {
      // Verificăm dacă emailul există deja
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

      // Folosim emailul ca identificator unic
      const tempUid = newUserEmail

      // Adăugăm utilizatorul
      const success = await addUserWithFullAccess(tempUid, newUserEmail, user?.email || "admin")

      if (success) {
        // Adăugăm utilizatorul în lista locală
        const newUser: UserRole = {
          uid: tempUid,
          email: newUserEmail,
          fullAccess: true,
          addedBy: user?.email || "admin",
          addedAt: Date.now(),
        }

        setUsers([...users, newUser])
        setNewUserEmail("")

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
        // Eliminăm utilizatorul din lista locală
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddUser} className="flex items-center gap-2">
        <Input
          type="email"
          placeholder="Adaugă email utilizator"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          <MdAdd className="mr-2" /> Adaugă
        </Button>
      </form>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Adăugat de</TableHead>
              <TableHead>Data adăugării</TableHead>
              <TableHead className="w-[100px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  Nu există utilizatori cu acces complet
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.addedBy}</TableCell>
                  <TableCell>{new Date(user.addedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(user.uid)} disabled={isLoading}>
                      <MdDelete className="text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
