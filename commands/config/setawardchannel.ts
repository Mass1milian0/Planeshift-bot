// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import database from "../../singletons/database";

export default {
  data: new SlashCommandBuilder()
    .setName("setawardchannel")
    .setDescription("sets a channel where the bot will send XP award messages")
    .addChannelOption((option) =>
      option
        .setName("awardchannel")
        .setDescription("sets the channel where XP award messages will be sent")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const awardChannel = interaction.options.getChannel("awardchannel");
    if (!awardChannel || !awardChannel.isTextBased()) {
      return interaction.reply({
        content: "Invalid channel selected.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await database.botConfig.update({
      where: { id: 1 },
      data: { awardChannel: awardChannel.id },
    });
    await interaction.reply({
      content: "Bot configuration updated successfully.",
      flags: MessageFlags.Ephemeral,
    });
  },
};
