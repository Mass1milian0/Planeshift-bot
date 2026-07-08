// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, messageLink, SlashCommandBuilder } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";
import webhook from "../../singletons/discordWebhook.ts"

export default {
  data: new SlashCommandBuilder()
    .setName("donatexp")
    .setDescription(
      "donate a certain amount of XP to an entity of your choosing"
    )
    .addNumberOption((option) =>
      option
        .setName("entity")
        .setDescription("The entity to donate XP to")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of XP to donate")
        .setRequired(true)
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const entities = await sendDBRequest("xpDonationEntities", "findMany", {});
    const choices = entities.map((entity: any) => ({
      name: entity.entityName,
      value: Number(entity.id),
    }));
    const filtered = choices.filter((choice: { name: string }) =>
      choice.name.startsWith(focusedValue)
    );
    await interaction.respond(filtered);
  },
  async execute(interaction: any) {
    //get the donation channel, which is the same channel as the webhook
    //@ts-ignore
    if(interaction.channelId !== webhook.webhook.channelId) {
      return interaction.reply({
        content: "This command can only be used in the donation channel.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const entity = interaction.options.getNumber("entity");
    const amount = interaction.options.getNumber("amount");

    if (!entity || !amount || amount <= 0 || typeof(amount) !== "number") {
      return interaction.reply({
        content: "Invalid input.",
        flags: MessageFlags.Ephemeral,
      });
    }

    //get the current total xp of the entity and its donation message
    const entityData = await sendDBRequest("xpDonationEntities", "findUnique", {
      where: { id: entity },
    });
    if (!entityData) {
      return interaction.reply({
        content: "Entity not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentXP = entityData.totalXp || 0;
    const newXP = currentXP + amount;

    let message = `<@${interaction.user.id}>
{user} offers {xp}xp!`;
    message = message.replace("{user}", `${interaction.user.displayName}`);
    message = message.replace("{xp}", `${amount}`);
    // Process the XP donation logic here

    await interaction.reply({
      content: message,
    });
    const response = await interaction.fetchReply();
    const webhookMessage = {
      content: entityData.donationMessage,
      username: entityData.entityName,
      avatarURL: entityData.entityImageUrl
    }
    webhookMessage.content = webhookMessage.content.replace("{user}", `${interaction.user.displayName}`);
    webhookMessage.content = webhookMessage.content.replace("{xp}", `${amount}`);
    webhook.webhook.send(webhookMessage);
    await sendDBRequest("xpDonationEntities", "update", {
      where: { id: entity },
      data: { totalXp: newXP },
    });

    await sendDBRequest("xpDonationLog", "create", {
      data: {
        userId: interaction.user.id,
        xpDonated: amount,
        entityId: entity,
        messageLink: `https://discord.com/channels/${process.env.GUILD_ID}/${interaction.channelId}/${response.id}`,
      },
    });
  },
};
