// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { Client, Events, GatewayIntentBits } from 'discord.js';
const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent];
const client = new Client({ intents });
let clientLoggedIn = false;
let clientReady = false;
let awaitClientReady = new Promise<void>((resolve) => {
	client.once(Events.ClientReady, readyClient => {
		console.log(`Client created! Logged in as ${readyClient.user.tag}`);
		clientReady = true;
		resolve();
	});
});

client.login(process.env.TOKEN ?? "")
    .then(() => {
        clientLoggedIn = true;
    })
    .catch(error => console.error('Failed to login:', error));

export { client as default, clientLoggedIn, clientReady, awaitClientReady };