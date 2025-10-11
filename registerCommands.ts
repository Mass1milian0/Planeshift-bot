// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import commands from './singletons/commands.ts';
const commandsRest = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath).then(mod => mod.default).catch(err => {
            console.error(`Failed to load command from ${filePath}:`, err);
            return null;
        });
		if (command && 'data' in command && 'execute' in command) {
			if(folder !== "internal") {
				commandsRest.push(command.data.toJSON());
			}
			commands.addCommand(command.data.name, command.execute);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN ?? "");

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commandsRest.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			process.env.GUILD_ID ? Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "", process.env.GUILD_ID) : Routes.applicationCommands(process.env.CLIENT_ID ?? ""),
			{ body: commandsRest },
		);

		console.log(`Successfully reloaded ${commandsRest.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
