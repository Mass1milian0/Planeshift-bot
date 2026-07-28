// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, messageLink, SlashCommandBuilder } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";
import webhook from "../../singletons/discordWebhook.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("donatexp")
    .setDescription(
      "donate a certain amount of XP to an entity of your choosing",
    )
    .addNumberOption((option) =>
      option
        .setName("entity")
        .setDescription("The entity to donate XP to")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of XP to donate")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("character")
        .setDescription("The character to donate XP from")
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused(true);
    let filtered: any[] = [];
    switch (focusedValue.name) {
      case "entity":
        filtered = await autocompleteEntities(focusedValue.value);
        break;
      case "character":
        filtered = await autocompleteCharacters(
          focusedValue.value,
          interaction.user.id,
        );
        break;
      default:
        break;
    }
    await interaction.respond(filtered);
  },
  async execute(interaction: any) {
    //get the donation channel, which is the same channel as the webhook
    //@ts-ignore
    if (interaction.channelId !== webhook.webhook.channelId) {
      return interaction.reply({
        content: "This command can only be used in the donation channel.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const entity = interaction.options.getNumber("entity");
    const amount = interaction.options.getNumber("amount");
    const character = interaction.options.getNumber("character");

    if (!entity || !amount || amount <= 0 || typeof amount !== "number") {
      return interaction.reply({
        content: "Invalid input.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!character || character <= 0 || typeof character !== "number") {
      //if character is specifically -1, then tell the user to register a character
      if (character === -1) {
        return interaction.reply({
          content:
            "You need to register a character first. Use the /registerCharacter command.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: "Invalid character.",
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
    const characterData = await sendDBRequest("characters", "findUnique", {
      where: { id: character },
    });
    if (!characterData) {
      return interaction.reply({
        content: "Character not found.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const currentXP = entityData.totalXp || 0;
    const newXP = currentXP + amount;
    const donations = await sendDBRequest("xpDonationLog", "findMany", {
      where: {
        character: character,
        entityId: entity,
      },
      include: {
        characters: {
          select: {
            name: true,
          },
        },
        xpDonationEntities: {
          select: {
            entityName: true,
            shortName: true,
          },
        },
      },
    });
    const thresholds = await sendDBRequest("xpDonationThresholds", "findMany", {
      orderBy: {
        xpRequired: "asc",
      },
    });
    const thresholdNormalized: number[] = [];
    for (const threshold of thresholds) {
      thresholdNormalized.push(threshold.xpRequired);
    }
    const donationTotals = donations.reduce(
      (acc: { [key: string]: { xp: number; shortName: string | null } }, donation: any) => {
        const entityName = donation.xpDonationEntities.entityName;
        if (!acc[entityName]) {
          acc[entityName] = {
            xp: 0,
            shortName: donation.xpDonationEntities.shortName || null,
          };
        }
        acc[entityName].xp += Number(donation.xpDonated);
        return acc;
      },
      {},
    );

    //check if currentXP + amount donated exceeds any thresholds, if so, send a message to the user that they have reached a new threshold
    let newThreshold = thresholds.find(
      (t: { xpRequired: any; tier: number }) =>
          (donationTotals[entityData.entityName]?.xp || 0) + amount <= Number(t.xpRequired)
    );
    //finds the treshold that the user is currently at, if any
    let currentThreshold
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if ((donationTotals[entityData.entityName]?.xp || 0) >= Number(thresholds[i].xpRequired)) {
        //if the xp i have are greater than or equal to the xp required for this threshold
        currentThreshold = thresholds[i]; //this is the current threshold
      }
    }
    if (newThreshold && currentThreshold && newThreshold.tier === currentThreshold.tier) {
      newThreshold = null;
    }
    //inject entity shortname into newThreshold if it exists
    if (newThreshold) {
      newThreshold.shortName = entityData.shortName || null;
      if (!newThreshold.shortName) {
        newThreshold = null;
      }
    }
    let message = `<@${interaction.user.id}>
{character} offers {xp}xp!`;
    message = message.replace("{user}", `${interaction.user.displayName}`);
    message = message.replace("{xp}", `${amount}`);
    message = message.replace("{character}", `${characterData.name}`);
    // Process the XP donation logic here

    await interaction.reply({
      content: message,
    });
    const response = await interaction.fetchReply();
    const webhookMessage = {
      content: entityData.donationMessage,
      username: entityData.entityName,
      avatarURL: entityData.entityImageUrl,
    };
    webhookMessage.content = webhookMessage.content.replace(
      "{user}",
      `${interaction.user.displayName}`,
    );
    webhookMessage.content = webhookMessage.content.replace(
      "{xp}",
      `${amount}`,
    );
    await webhook.webhook.send(webhookMessage);
    if (newThreshold) {
      let msg=`Congratulations! {user} you have reached tier ${newThreshold.tier} for {entity}.
to claim your reward, please use the command \`\`!ElderBoons {shortname} ${newThreshold.tier}\`\``;
      msg = msg.replace("{user}", `${interaction.user.displayName}`);
      msg = msg.replace("{entity}", `${entityData.entityName}`);
      msg = msg.replace("{shortname}", `${entityData.shortName}`);
      
      await interaction.followUp({
        content: msg,
      });
    }
    await sendDBRequest("xpDonationEntities", "update", {
      where: { id: entity },
      data: { totalXp: newXP },
    });

    await sendDBRequest("xpDonationLog", "create", {
      data: {
        userId: characterData.player,
        xpDonated: amount,
        entityId: entity,
        character: character,
        messageLink: `https://discord.com/channels/${process.env.GUILD_ID}/${interaction.channelId}/${response.id}`,
      },
    });
  },
};
async function autocompleteEntities(focusedValue: any) {
  const entities = await sendDBRequest("xpDonationEntities", "findMany", {});
  const choices = entities.map((entity: any) => ({
    name: entity.entityName,
    value: Number(entity.id),
  }));
  const filtered = choices.filter((choice: { name: string }) =>
    choice.name.startsWith(focusedValue),
  );
  return filtered;
}
async function autocompleteCharacters(focusedValue: any, userId: any) {
  const characters = await sendDBRequest("characters", "findMany", {
    where: {
      players: {
        userId: userId,
      },
      enabled: true,
    },
  });
  const choices = characters.map((character: any) => ({
    name: character.name,
    value: Number(character.id),
  }));
  const filtered = choices.filter((choice: { name: string }) =>
    choice.name.startsWith(focusedValue),
  );
  //as a invalid choice, add a choice to tell the user to register a character if they can't find their character
  filtered.push({
    name: "Can't see the name of your character? run /registerCharacter.",
    value: -1,
  });
  return filtered;
}
