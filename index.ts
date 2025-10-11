// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { Events, MessageFlags } from "discord.js";
import client from "./singletons/discordClient.ts";
import "./registerCommands.js";
import commands from "./singletons/commands.ts";
import worker, { initWorker } from "./singletons/worker.ts";
import database, { sendDBRequest } from "./singletons/database.ts";
interface message {
  type: string;
  content: any;
}
if (Number(process.env.init)) {
  console.log(
    "Initialization flag detected, running initial setup, please restart the bot once configuration is complete."
  );
} else {
  initWorker();
  worker.on("message", async(message: message) => {
    switch (message.type) {
      case "FATAL":
        console.error(`Worker fatal error: ${message.content}`);
        //kill the worker
        worker.terminate();
        console.error(
          "FATAL ERROR: Message Sentry worker has terminated, restart needed"
        );
        break;
      case "LOAD_CONFIG":
        //request to load configuration
        worker.postMessage({
          type: "CONFIG_LOAD",
          content: {
            botConfig: await sendDBRequest("botConfig", "findUnique", {
              where: { id: 1 },
              include: {
                xpAwardTypes: {
                  select: {
                    awardType: true,
                  },
                },
              },
            }),
            channelBlacklist: await sendDBRequest("channelBlacklist", "findMany", {
              select: { channelId: true },
              where: { blacklisted: true },
            }),
            channelConfig: await sendDBRequest("channelConfig", "findMany", {}),
            ignoredCharacters: await sendDBRequest(
              "ignoredCharacters",
              "findMany",
              {}
            ),
            thresholds: await sendDBRequest("thresholds", "findMany", {}),
          },
        });
        break;
      case "DB_REQUEST":
        try {
          const data = await sendDBRequest(message.content.type, message.content.action, message.content.data);
          worker.postMessage({ type: "DB_RESPONSE", content: { id: message.content.id, data } });
        } catch (err : any) {
          worker.postMessage({
            type: "DB_RESPONSE",
            content: {
              id: message.content.id,
              error: err.message || String(err),
            },
          });
        }
        break;
      default:
        console.warn(`Worker unknown message type: ${message.type}`);
    }
  });
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  const command = commands.getCommand(
    interaction.isCommand() ? interaction.commandName : interaction.customId
  );
  if (!command) return;

  try {
    await command(interaction);
  } catch (error) {
    console.error(
      `Error executing command ${
        interaction.isCommand() ? interaction.commandName : interaction.customId
      }:`,
      error
    );
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    });
  }
});
