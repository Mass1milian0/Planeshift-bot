// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import database from "../../singletons/database";

export default {
	data: new SlashCommandBuilder()
		.setName('getblacklist')
		.setDescription('Retrieves the current blacklist status for the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction: any) {
		const blacklist = await database.channelBlacklist.findMany({
            where: { blacklisted: true }
        });
		if (blacklist.length === 0) {
			return interaction.reply({ content: "No channels are blacklisted.", flags: MessageFlags.Ephemeral });
		}
		const blacklistedChannels = blacklist.map((entry: any) => `<#${entry.channelId}>`).join(", ");
		console.log("Blacklisted channels:", blacklistedChannels.length);
		if (blacklistedChannels.length > 1500) {
			// Split the string into chunks of 1500 characters or less, ensuring splits occur at commas
			const chunks: string[] = [];
			let currentChunk = "";

			for (const entry of blacklist) {
				const channelString = `<#${entry.channelId}>, `;

				// Check if adding this channel would exceed the 1500-character limit
				if (currentChunk.length + channelString.length > 1500) {
					chunks.push(currentChunk.slice(0, -2)); // Remove the trailing ", " before adding
					currentChunk = channelString; // Start a new chunk
				} else {
					currentChunk += channelString; // Add to the current chunk
				}
			}

			// Add the last chunk if it exists
			if (currentChunk) {
				chunks.push(currentChunk.slice(0, -2)); // Remove the trailing ", "
			}

			// Send the chunks as separate messages
			await interaction.reply({ content: `Blacklisted channels (split into chunks):`, flags: MessageFlags.Ephemeral });
			for (const chunk of chunks) {
				if (chunk.length > 1500) {
					console.error("Chunk exceeds 1500 characters:", chunk); // Debugging log
				}
				await interaction.followUp({ content: chunk, flags: MessageFlags.Ephemeral });
			} 
		} else {
			await interaction.reply({ content: `Blacklisted channels: ${blacklistedChannels}`, flags: MessageFlags.Ephemeral });
		}
	},
};