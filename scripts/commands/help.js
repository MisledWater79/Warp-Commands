import { world } from "mojang-minecraft"
import CommandBuilder from "../classes/builders/CommandBuilder.js";
import CommandHandler from "../classes/CommandRegistration.js"

const registration = new CommandBuilder()
.setName('help')
.setAliases(['?'])
.setDescription('Provides help/list of command')
.setUsage(['<page: int>','[command: CommandName]'])
.setCancelMessage(true)
.setPrivate(false)
.addInput(input => {
  return input.setName('command').setType('string').setDescription('command name you need help on!')
})

CommandHandler.register(registration, (interaction) => {
  runCommand(`tellraw "${interaction.player.nameTag}" {"rawtext":[{"text":"§9Command Prefix§f: §b-\n§f- §9warp §b<warp name>\n§f- §9warp list\n§f- §9warp form"}]}`)
})

function runCommand(command, dimension = 'overworld') {
	try {
		return world.getDimension(dimension).runCommand(command)
	} catch (e) {}
}