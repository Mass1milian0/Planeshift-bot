// @ts-nocheck
// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { PrismaClient } from "./../generated/prisma";

const database = new PrismaClient();

async function sendDBRequest(table : any, method: string, args: any) {
  try {
    const result = await database[table][method](args);
    return result;
  } catch (error) {
    //attempt retry logic
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 250)); // wait for 250ms before retrying
      try {
        const result = await database[table][method](args);
        return result;
      } catch (error) {
        if (i === 4) {
          console.error("Database request failed after 5 attempts:", error);
          throw error;
        }
      }
    }
  }
}

export { database as default, sendDBRequest };
