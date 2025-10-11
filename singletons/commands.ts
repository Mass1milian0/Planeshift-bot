// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { Collection } from 'discord.js';
const commands = {
    commands : new Collection<string, any>(),
    addCommand: (name: string, execute: Function) => {
        commands.commands.set(name, execute);
    },
    getCommand: (name: string) => {
        return commands.commands.get(name);
    },
    removeCommand: (name: string) => {
        commands.commands.delete(name);
    }
}

export default commands