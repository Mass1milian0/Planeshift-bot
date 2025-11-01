// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import database from "../../singletons/database";
export default {
	data: new SlashCommandBuilder()
		.setName('getleaderboard')
		.setDescription('Retrieves the current leaderboard, all users.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction: any) {
		const leaderboard = await database.userXp.findMany({
			orderBy: { xp: 'desc' },
		});

		if (!leaderboard || leaderboard.length === 0) {
			return interaction.reply({ content: "No users found.", flags: MessageFlags.Ephemeral });
		}
        const leaderboardMessage = leaderboard.map((user: any, index: number) => {
            return `${index + 1}. <@${user.userId}> - rank: ${user.rank || 0} - ${user.xp} XP`;
        }).join("\n");

		if(leaderboardMessage.length > 1500) {
            // Split the string into chunks of 1500 characters or less, ensuring splits occur at \n
            const chunks: string[] = [];
            let currentChunk = "";

            for (const line of leaderboardMessage.split("\n")) {
                // Check if adding this line would exceed the 1500-character limit
                if (currentChunk.length + line.length > 1500) {
                    chunks.push(currentChunk);
                    currentChunk = line;
                } else {
                    currentChunk += "\n" + line;
                }
            }

            // Add the last chunk if it exists
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // Send the chunks as separate messages
            await interaction.reply({ content: `Leaderboard (split into chunks):`, flags: MessageFlags.Ephemeral });
            for (const chunk of chunks) {
                if (chunk.length > 1500) {
                    console.error("Chunk exceeds 1500 characters:", chunk); // Debugging log
                }
                await interaction.followUp({ content: chunk, flags: MessageFlags.Ephemeral });
            }
        } else {
            await interaction.reply({ content: `Leaderboard: ${leaderboardMessage}`, flags: MessageFlags.Ephemeral });
        }
	}
}