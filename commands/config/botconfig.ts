// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import database from "../../singletons/database";
import {sendUpdate} from "../../singletons/worker";

export default {
  data: new SlashCommandBuilder()
    .setName("botconfig")
    .setDescription("Configure bot settings")
    .addNumberOption((option) =>
      option
        .setName("xpawardtype")
        .setDescription("sets the way xp is calculated (default, Per Message)")
        .addChoices(
          { name: "Per Message", value: 1 },
          { name: "Per Character", value: 2 },
          { name: "Per Word", value: 3 }
        )
    )
    .addNumberOption((option) =>
      option
        .setName("xpperaward")
        .setDescription(
          "XP awarded per award trigger (can be set to decimal numbers, default: 10)"
        )
    )
    .addStringOption((option) =>
      option
        .setName("awardmessage")
        .setDescription(
          "Custom message sent when XP is awarded. {user} and {tier} are valid substitutions."
        )
    )
    .addStringOption((option) =>
      option
        .setName("cooldown")
        .setDescription("Cooldown period between XP awards (in seconds)")
    )
    .addBooleanOption((option) =>
      option
        .setName("whitelistmode")
        .setDescription("Enables or disables whitelist mode")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    if (interaction.options.getNumber("xpawardtype")) {
      const xpAwardType = interaction.options.getNumber("xpawardtype");
      await database.botConfig.update({
        where: { id: 1 },
        data: { awardType: xpAwardType },
      });
    }
    if (interaction.options.getNumber("xpperaward")) {
      const xpPerAward = interaction.options.getNumber("xpperaward");
      await database.botConfig.update({
        where: { id: 1 },
        data: { xpPerAward },
      });
    }
    if (interaction.options.getString("awardmessage")) {
      const awardMessage = interaction.options.getString("awardmessage");
      await database.botConfig.update({
        where: { id: 1 },
        data: { awardMessage },
      });
    }
    if (interaction.options.getString("cooldown")) {
      const cooldown = interaction.options.getString("cooldown");
      await database.botConfig.update({
        where: { id: 1 },
        data: { cooldown },
      });
    }
    if (interaction.options.getBoolean("whitelistmode")) {
      const whitelistmode = interaction.options.getBoolean("whitelistmode");
      await database.botConfig.update({
        where: { id: 1 },
        data: { whitelistmode },
      });
    }

    await interaction.reply({
      content: "Bot configuration updated successfully.",
      flags: MessageFlags.Ephemeral,
    });
    sendUpdate();
  },
};
