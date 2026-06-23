import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter")
});

export const hostSchema = z.object({
    full_name: z.string()
        .min(3, "Nama tidak valid (min. 3 karakter, minimal 2 kata)")
        .max(100, "Nama terlalu panjang (maks. 100 karakter)")
        .refine(val => !/\s{2,}/.test(val.trim()), { message: "Nama tidak boleh mengandung spasi ganda" })
        .refine(val => /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.']*$/.test(val.trim().replace(/\s{2,}/g, ' ')), {
            message: "Nama hanya boleh mengandung huruf, spasi, titik, atau apostrof"
        })
});
