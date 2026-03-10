"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/lib/api/auth";
import { getInitials } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  whatsapp_number: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^(08|62|\+62)\d{8,12}$/.test(v),
      "Format nomor WA tidak valid (contoh: 081234567890)"
    ),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      whatsapp_number: user?.whatsapp_number ?? "",
    },
  });

  async function onSubmit(values: ProfileForm) {
    setIsLoading(true);
    try {
      const updated = await updateProfile(values);
      setUser(updated);
      toast.success("Profil berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi akun Anda</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback>{user ? getInitials(user.name) : "?"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              {user?.roles.map((r) => (
                <span
                  key={r.id}
                  className="mt-1 mr-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium"
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email — read only */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Nama lengkap"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">Nomor WhatsApp</Label>
              <Input
                id="whatsapp_number"
                placeholder="081234567890"
                {...register("whatsapp_number")}
                className={errors.whatsapp_number ? "border-destructive" : ""}
              />
              {errors.whatsapp_number && (
                <p className="text-xs text-destructive">{errors.whatsapp_number.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading || !isDirty}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save className="h-4 w-4" /> Simpan Perubahan</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
