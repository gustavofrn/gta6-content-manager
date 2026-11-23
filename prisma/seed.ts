import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env antes do seed.");
  }
  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.");
  }

  // Cria ou atualiza a role de admin
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  // Cria ou atualiza o usuário admin
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: "Administrador", roleId: adminRole.id },
    create: {
      email: adminEmail,
      name: "Administrador",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  // Configurações padrão do sistema
  const defaultSettings = [
    { key: "page_name", value: "GTA 6", category: "identity" },
    { key: "page_handle", value: "", category: "identity" },
    { key: "timezone", value: "", category: "general" },
    { key: "language", value: "pt-BR", category: "general" },
    { key: "voice_tone", value: "hype mas limpo", category: "identity" },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("Seed concluído. Use as credenciais definidas no .env.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
