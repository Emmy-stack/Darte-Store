// src/inngest/functions.ts
import { inngest } from "./client";
import prisma from "@/lib/prisma";

// Inngest function to save user data to the database
export const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-create",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    // Generate unique username "darteXXXXXX" where XXXXXX are 6 random unique digits
    let username = "";
    let isUnique = false;
    while (!isUnique) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
      username = `darte${randomDigits}`;
      const existingUser = await prisma.user.findUnique({ where: { username } });
      const existingStore = await prisma.store.findUnique({ where: { username } });
      if (!existingUser && !existingStore) {
        isUnique = true;
      }
    }

    await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email_addresses[0].email_address,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        image: data.image_url,
      },
      create: {
        id: data.id,
        email: data.email_addresses[0].email_address,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        image: data.image_url,
        username,
      },
    });
  }
);

// Function to update user data in database
export const syncUserUpdate = inngest.createFunction(
  {
    id: "sync-user-update",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email_addresses[0].email_address,
        name: `${data.first_name} ${data.last_name}`,
        image: data.image_url,
      },
    });
  }
);

// Function to delete user data from database
export const syncUserDeletion = inngest.createFunction(
  {
    id: "sync-user-delete",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: { id: data.id },
    });
  }
);