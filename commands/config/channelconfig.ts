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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const ch = await database.channelConfig.upsert({
      where: { channelId: interaction.channelId },
      create: { channelId: interaction.channelId },
      update: {
        followThreads: interaction.options.getBoolean("followthreads"),
      },
    });
    if (ch.followThreads) {
      await interaction.reply({
        content: "Channel will reward XP for thread messages.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "Channel will not reward XP for thread messages.",
        flags: MessageFlags.Ephemeral,
      });
    }
    sendUpdate(); 
  },
};
