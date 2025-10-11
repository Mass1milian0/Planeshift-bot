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
		await interaction.reply({ content: `Blacklisted channels: ${blacklistedChannels}`, flags: MessageFlags.Ephemeral });
	},
};