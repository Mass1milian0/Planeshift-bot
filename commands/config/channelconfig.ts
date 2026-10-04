// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import database from "../../singletons/database";
import { sendUpdate } from "../../singletons/worker";

export default {
  data: new SlashCommandBuilder()
    .setName("channelconfig")
    .setDescription("Configure channel settings")
    .addBooleanOption((option) =>
      option
        .setName("followthreads")
        .setDescription(
          "Should threads of this channel reward xp? (default true)"
        )
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("guildchannel")
        .setDescription(
          "is this a guild chat? (additional rpXp)"
        )
        .setChoices(
          { name: "No (default)", value: 0 },
          { name: "T1 Guild", value: 1},
          { name: "T3 Guild", value: 2}
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {

    //set defaults if null
    const ft = interaction.options.getBoolean("followthreads") ?? true;
    const gc = interaction.options.getInteger("guildchannel") ?? 0;
    try{
      const ch = await database.channelConfig.upsert({
        where: { channelId: interaction.channelId },
        create: { channelId: interaction.channelId },
        update: {
          followThreads: ft,
          rpXpLevel: gc
        },
      });
      sendUpdate();
      await interaction.reply({
        content: "Channel configuration updated successfully.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "An error occurred while updating the channel configuration.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
