import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("Broadcasts a message to all whitelisted channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    interaction.reply({
      content: "Please send a message to broadcast after this message.",
    });
    const collector = interaction.channel.createMessageCollector({
      filter: (m: { author: { id: any } }) =>
        m.author.id === interaction.user.id,
      max: 1,
      time: 60000,
    });

    collector.on("collect", async (message: { content: any }) => {
      if (message.content.length > 1500) {
        return interaction.followUp({
          content: "Message is too long. Please limit it to 1500 characters.",
        });
      }
      // Fetch all whitelisted channels from the database
      const channels = await sendDBRequest("channelBlacklist", "findMany", {
        select: { channelId: true },
        where: { blacklisted: true },
      });

      // Send the message to each channel
      for (const channel of channels) {
        const targetChannel = interaction.client.channels.cache.get(
          channel.channelId
        );
        console.log(targetChannel)
        if (targetChannel && targetChannel.isTextBased()) {
          targetChannel.send(message.content);
          //await 3 seconds before sending the next message
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      interaction.followUp({
        content: "Message broadcasted to all whitelisted channels.",
      });
    });

    collector.on("end", (collected: { size: number; }) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: "No message was sent within the time limit.",
        });
      }
    });
  },
};
